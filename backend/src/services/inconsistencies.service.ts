import { AspectType } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { buildIncompleteJudgementReason, getRequiredJudgementMarks } from "./judgement-rules.service.js";

export type InconsistencyType =
  | "MISSING_MARK"
  | "JUDGEMENT_DIVERGENCE"
  | "INCOMPLETE_JUDGEMENT"
  | "UNLOCKED_COMPLETE_MODULE"
  | "PARTIAL_MODULE"
  | "EMPTY_MODULE"
  | "LOCKED_WITH_PENDING"
  | "MISSING_COMPETITOR_MODULE"
  | "PERMISSION_OR_DATA_WARNING";

export type InconsistencySeverity = "critical" | "warning" | "info";

export type InconsistencyItem = {
  id: string;
  type: InconsistencyType;
  severity: InconsistencySeverity;
  title: string;
  reason: string;
  recommendation: string;
  competitor: {
    id: number;
    name: string;
    state: string | null;
    workstation: string | null;
  };
  module: {
    id: number;
    code: string;
    name: string;
  };
  subCriterion: {
    id: number;
    code: string;
    name: string;
  } | null;
  aspect: {
    id: number;
    code: string;
    description: string;
    type: string;
  } | null;
  values: Array<{
    expertId: number;
    expertName: string;
    value: number;
    observation: string | null;
    locked: boolean;
  }>;
  createdAt: string | null;
};

export class InconsistenciesServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function toNumber(value: number | string | { toString: () => string }) {
  return Number(value);
}

function getSeverity(type: InconsistencyType): InconsistencySeverity {
  if (
    type === "MISSING_MARK" ||
    type === "JUDGEMENT_DIVERGENCE" ||
    type === "EMPTY_MODULE" ||
    type === "MISSING_COMPETITOR_MODULE"
  ) {
    return "critical";
  }

  if (
    type === "INCOMPLETE_JUDGEMENT" ||
    type === "PARTIAL_MODULE" ||
    type === "LOCKED_WITH_PENDING"
  ) {
    return "warning";
  }

  return "info";
}

function makeValues(
  marks: Array<{
    expertId: number;
    value: unknown;
    observation: string | null;
    locked: boolean;
    expert: { name: string };
  }>,
) {
  return marks.map((mark) => ({
    expertId: mark.expertId,
    expertName: mark.expert.name,
    value: toNumber(mark.value as number | string | { toString: () => string }),
    observation: mark.observation,
    locked: mark.locked,
  }));
}

function getEarliestCreatedAt(marks: Array<{ createdAt: Date }>) {
  if (marks.length === 0) {
    return null;
  }

  return marks
    .map((mark) => mark.createdAt)
    .sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() ?? null;
}

export async function listCompetitionInconsistencies(competitionId: number) {
  const [competition, competitors, modules] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true },
    }),
    prisma.competitor.findMany({
      where: { competitionId },
      orderBy: [{ workstation: "asc" }, { name: "asc" }],
    }),
    prisma.module.findMany({
      where: { competitionId },
      orderBy: { code: "asc" },
      include: {
        criteria: {
          orderBy: { code: "asc" },
          include: {
            subCriteria: {
              orderBy: { code: "asc" },
              include: {
                aspects: {
                  orderBy: { code: "asc" },
                  include: {
                    marks: {
                      include: {
                        expert: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!competition) {
    throw new InconsistenciesServiceError(404, "Competition not found");
  }

  const { requiredJudgementMarks } = await getRequiredJudgementMarks(competitionId);
  const items: InconsistencyItem[] = [];

  for (const competitor of competitors) {
    for (const module of modules) {
      const aspects = module.criteria.flatMap((criterion) =>
        criterion.subCriteria.flatMap((subCriterion) =>
          subCriterion.aspects.map((aspect) => ({
            ...aspect,
            subCriterion,
          })),
        ),
      );
      const moduleMarks = aspects.flatMap((aspect) =>
        aspect.marks.filter((mark) => mark.competitorId === competitor.id),
      );
      let missingAspects = 0;
      let hasJudgementDivergence = false;
      let hasIncompleteJudgement = false;

      for (const aspect of aspects) {
        const marks = aspect.marks.filter((mark) => mark.competitorId === competitor.id);
        const values = makeValues(marks);
        const base = {
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: {
            id: aspect.subCriterion.id,
            code: aspect.subCriterion.code,
            name: aspect.subCriterion.name,
          },
          aspect: {
            id: aspect.id,
            code: aspect.code,
            description: aspect.description,
            type: aspect.type,
          },
          values,
          createdAt: getEarliestCreatedAt(marks),
        };

        if (marks.length === 0) {
          missingAspects += 1;
          items.push({
            id: `MISSING_MARK-${competitor.id}-${module.id}-${aspect.id}`,
            type: "MISSING_MARK",
            severity: getSeverity("MISSING_MARK"),
            title: "Aspecto sem nota",
            reason: `O aspecto ${aspect.code} ainda não possui nenhuma nota lançada para este competidor.`,
            recommendation: "Lance a nota desse aspecto na tela de Lançamento de Notas.",
            ...base,
          });
          continue;
        }

        if (aspect.type === AspectType.JUDGEMENT) {
          if (marks.length < requiredJudgementMarks) {
            hasIncompleteJudgement = true;
            items.push({
              id: `INCOMPLETE_JUDGEMENT-${competitor.id}-${module.id}-${aspect.id}`,
              type: "INCOMPLETE_JUDGEMENT",
              severity: getSeverity("INCOMPLETE_JUDGEMENT"),
              title: "Julgamento incompleto",
              reason: buildIncompleteJudgementReason(marks.length, requiredJudgementMarks),
              recommendation: "Solicite que os avaliadores restantes lancem suas notas.",
              ...base,
            });
          }

          if (values.length >= 2) {
            const difference =
              Math.max(...values.map((value) => value.value)) -
              Math.min(...values.map((value) => value.value));

            if (difference > 1) {
              hasJudgementDivergence = true;
              items.push({
                id: `JUDGEMENT_DIVERGENCE-${competitor.id}-${module.id}-${aspect.id}`,
                type: "JUDGEMENT_DIVERGENCE",
                severity: getSeverity("JUDGEMENT_DIVERGENCE"),
                title: "Divergência de julgamento",
                reason: "As notas de julgamento possuem diferença maior que 1 entre avaliadores.",
                recommendation: "Reunir os avaliadores responsáveis e revisar o julgamento antes do fechamento.",
                ...base,
              });
            }
          }
        }
      }

      if (aspects.length === 0) {
        items.push({
          id: `PERMISSION_OR_DATA_WARNING-${competitor.id}-${module.id}`,
          type: "PERMISSION_OR_DATA_WARNING",
          severity: getSeverity("PERMISSION_OR_DATA_WARNING"),
          title: "Módulo sem estrutura",
          reason: "O módulo não possui aspectos cadastrados para avaliação.",
          recommendation: "Verifique a importação da ficha ou o cadastro da estrutura da avaliação.",
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: null,
          aspect: null,
          values: [],
          createdAt: null,
        });
        continue;
      }

      if (moduleMarks.length === 0) {
        items.push({
          id: `EMPTY_MODULE-${competitor.id}-${module.id}`,
          type: "EMPTY_MODULE",
          severity: getSeverity("EMPTY_MODULE"),
          title: "Módulo não iniciado",
          reason: "Nenhuma nota foi lançada para este competidor neste módulo.",
          recommendation: "Iniciar a avaliação do módulo ou confirmar se ele ainda não foi corrigido.",
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: null,
          aspect: null,
          values: [],
          createdAt: null,
        });
      } else if (missingAspects > 0) {
        items.push({
          id: `PARTIAL_MODULE-${competitor.id}-${module.id}`,
          type: "PARTIAL_MODULE",
          severity: getSeverity("PARTIAL_MODULE"),
          title: "Módulo parcial",
          reason: "O módulo foi iniciado, mas ainda não foi totalmente avaliado.",
          recommendation: "Verifique os aspectos pendentes antes da conferência final.",
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: null,
          aspect: null,
          values: [],
          createdAt: getEarliestCreatedAt(moduleMarks),
        });
      }

      const hasLockedMarks = moduleMarks.some((mark) => mark.locked);
      const hasUnlockedMarks = moduleMarks.some((mark) => !mark.locked);

      if (hasLockedMarks && (missingAspects > 0 || hasJudgementDivergence || hasIncompleteJudgement)) {
        items.push({
          id: `LOCKED_WITH_PENDING-${competitor.id}-${module.id}`,
          type: "LOCKED_WITH_PENDING",
          severity: getSeverity("LOCKED_WITH_PENDING"),
          title: "Bloqueado com pendência",
          reason: "Existem notas bloqueadas, mas o módulo ainda possui pendências ou revisões.",
          recommendation: "Desbloquear o módulo/subcritério necessário, corrigir as pendências e bloquear novamente.",
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: null,
          aspect: null,
          values: [],
          createdAt: getEarliestCreatedAt(moduleMarks),
        });
      }

      if (missingAspects === 0 && !hasJudgementDivergence && !hasIncompleteJudgement && hasUnlockedMarks) {
        items.push({
          id: `UNLOCKED_COMPLETE_MODULE-${competitor.id}-${module.id}`,
          type: "UNLOCKED_COMPLETE_MODULE",
          severity: getSeverity("UNLOCKED_COMPLETE_MODULE"),
          title: "Módulo completo desbloqueado",
          reason: "O módulo está completo, mas ainda possui notas desbloqueadas.",
          recommendation: "Conferir o módulo e bloquear as notas para evitar alterações acidentais.",
          competitor: {
            id: competitor.id,
            name: competitor.name,
            state: competitor.state,
            workstation: competitor.workstation,
          },
          module: {
            id: module.id,
            code: module.code,
            name: module.name,
          },
          subCriterion: null,
          aspect: null,
          values: [],
          createdAt: getEarliestCreatedAt(moduleMarks),
        });
      }
    }
  }

  return {
    competition,
    summary: buildSummary(items),
    items,
  };
}

function buildSummary(items: InconsistencyItem[]) {
  return {
    total: items.length,
    critical: items.filter((item) => item.severity === "critical").length,
    warning: items.filter((item) => item.severity === "warning").length,
    info: items.filter((item) => item.severity === "info").length,
    missingMarks: items.filter((item) => item.type === "MISSING_MARK").length,
    judgementDivergences: items.filter((item) => item.type === "JUDGEMENT_DIVERGENCE").length,
    incompleteJudgements: items.filter((item) => item.type === "INCOMPLETE_JUDGEMENT").length,
    unlockedCompleteModules: items.filter((item) => item.type === "UNLOCKED_COMPLETE_MODULE").length,
    emptyModules: items.filter((item) => item.type === "EMPTY_MODULE").length,
  };
}

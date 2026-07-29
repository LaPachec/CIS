import { AspectType, AuditAction } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { buildIncompleteJudgementReason, getRequiredJudgementMarks } from "./judgement-rules.service.js";

export type CollectiveModuleStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "HAS_INCONSISTENCIES"
  | "READY_TO_LOCK"
  | "LOCKED";

export type CollectiveInconsistency = {
  type:
    | "MISSING_MARK"
    | "JUDGEMENT_DIVERGENCE"
    | "INCOMPLETE_JUDGEMENT"
    | "PARTIAL_MODULE"
    | "EMPTY_MODULE"
    | "LOCKED_WITH_PENDING"
    | "MISSING_COMPETITOR_MODULE";
  severity: "critical" | "warning";
  subCriterionId: number | null;
  subCriterionCode: string | null;
  aspectId: number | null;
  aspectCode: string | null;
  reason: string;
};

export type CompetitorModuleReadiness = {
  id: number;
  name: string;
  state: string | null;
  workstation: string | null;
  status: CollectiveModuleStatus;
  missingAspects: number;
  judgementReviewCount: number;
  incompleteJudgementCount: number;
  lockedMarks: number;
  unlockedMarks: number;
  markedAspects: number;
  totalAspects: number;
  canLock: boolean;
  inconsistencies: CollectiveInconsistency[];
};

export class ModuleClosingServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type ModuleWithStructure = NonNullable<Awaited<ReturnType<typeof loadModuleWithStructure>>>;
type CompetitionCompetitor = Awaited<ReturnType<typeof loadCompetitionCompetitors>>[number];

async function loadModuleWithStructure(moduleId: number) {
  return prisma.module.findUnique({
    where: { id: moduleId },
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
                      competitor: {
                        select: {
                          competitionId: true,
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
  });
}

async function loadCompetitionCompetitors(competitionId: number) {
  return prisma.competitor.findMany({
    where: { competitionId },
    orderBy: [{ workstation: "asc" }, { name: "asc" }],
  });
}

function flattenAspects(module: ModuleWithStructure) {
  return module.criteria.flatMap((criterion) =>
    criterion.subCriteria.flatMap((subCriterion) =>
      subCriterion.aspects.map((aspect) => ({
        ...aspect,
        subCriterion,
      })),
    ),
  );
}

export function checkCompetitorModuleReadiness(
  competitor: CompetitionCompetitor,
  module: ModuleWithStructure,
  requiredJudgementMarks: number,
): CompetitorModuleReadiness {
  const aspects = flattenAspects(module);
  const inconsistencies: CollectiveInconsistency[] = [];
  let missingAspects = 0;
  let judgementReviewCount = 0;
  let incompleteJudgementCount = 0;
  let lockedMarks = 0;
  let unlockedMarks = 0;
  let markedAspects = 0;
  let hasJudgementDivergence = false;

  for (const aspect of aspects) {
    const marks = aspect.marks.filter(
      (mark) =>
        mark.competitorId === competitor.id &&
        mark.competitor.competitionId === competitor.competitionId,
    );

    lockedMarks += marks.filter((mark) => mark.locked).length;
    unlockedMarks += marks.filter((mark) => !mark.locked).length;

    if (marks.length === 0) {
      missingAspects += 1;
      inconsistencies.push({
        type: "MISSING_MARK",
        severity: "critical",
        subCriterionId: aspect.subCriterion.id,
        subCriterionCode: aspect.subCriterion.code,
        aspectId: aspect.id,
        aspectCode: aspect.code,
        reason: `O aspecto ${aspect.code} ainda não possui nota lançada.`,
      });
      continue;
    }

    markedAspects += 1;

    if (aspect.type === AspectType.JUDGEMENT) {
      if (marks.length < requiredJudgementMarks) {
        incompleteJudgementCount += 1;
        inconsistencies.push({
          type: "INCOMPLETE_JUDGEMENT",
          severity: "warning",
          subCriterionId: aspect.subCriterion.id,
          subCriterionCode: aspect.subCriterion.code,
          aspectId: aspect.id,
          aspectCode: aspect.code,
          reason: buildIncompleteJudgementReason(marks.length, requiredJudgementMarks),
        });
      }

      if (marks.length >= 2) {
        const values = marks.map((mark) => Number(mark.value));
        const difference = Math.max(...values) - Math.min(...values);

        if (difference > 1) {
          hasJudgementDivergence = true;
          judgementReviewCount += 1;
          inconsistencies.push({
            type: "JUDGEMENT_DIVERGENCE",
            severity: "critical",
            subCriterionId: aspect.subCriterion.id,
            subCriterionCode: aspect.subCriterion.code,
            aspectId: aspect.id,
            aspectCode: aspect.code,
            reason: `As notas do aspecto ${aspect.code} possuem diferença maior que 1.`,
          });
        }
      }
    }
  }

  const totalAspects = aspects.length;

  if (totalAspects > 0 && markedAspects === 0) {
    inconsistencies.push({
      type: "EMPTY_MODULE",
      severity: "critical",
      subCriterionId: null,
      subCriterionCode: null,
      aspectId: null,
      aspectCode: null,
      reason: "Nenhuma nota foi lançada para este competidor neste módulo.",
    });
  } else if (markedAspects > 0 && missingAspects > 0) {
    inconsistencies.push({
      type: "PARTIAL_MODULE",
      severity: "warning",
      subCriterionId: null,
      subCriterionCode: null,
      aspectId: null,
      aspectCode: null,
      reason: "O módulo foi iniciado, mas ainda não foi totalmente avaliado.",
    });
  }

  if (lockedMarks > 0 && (missingAspects > 0 || hasJudgementDivergence || incompleteJudgementCount > 0)) {
    inconsistencies.push({
      type: "LOCKED_WITH_PENDING",
      severity: "warning",
      subCriterionId: null,
      subCriterionCode: null,
      aspectId: null,
      aspectCode: null,
      reason: "Existem notas bloqueadas, mas o módulo ainda possui pendências ou revisões.",
    });
  }

  const hasBlockingInconsistencies = inconsistencies.length > 0;
  const canLock = totalAspects > 0 && !hasBlockingInconsistencies && unlockedMarks > 0;
  const status = getCompetitorStatus({
    totalAspects,
    markedAspects,
    hasBlockingInconsistencies,
    lockedMarks,
    unlockedMarks,
  });

  return {
    id: competitor.id,
    name: competitor.name,
    state: competitor.state,
    workstation: competitor.workstation,
    status,
    missingAspects,
    judgementReviewCount,
    incompleteJudgementCount,
    lockedMarks,
    unlockedMarks,
    markedAspects,
    totalAspects,
    canLock,
    inconsistencies,
  };
}

function getCompetitorStatus(params: {
  totalAspects: number;
  markedAspects: number;
  hasBlockingInconsistencies: boolean;
  lockedMarks: number;
  unlockedMarks: number;
}): CollectiveModuleStatus {
  if (params.totalAspects === 0 || params.markedAspects === 0) {
    return "NOT_STARTED";
  }

  if (params.hasBlockingInconsistencies) {
    return "HAS_INCONSISTENCIES";
  }

  if (params.lockedMarks > 0 && params.unlockedMarks === 0) {
    return "LOCKED";
  }

  if (params.unlockedMarks > 0) {
    return "READY_TO_LOCK";
  }

  return "IN_PROGRESS";
}

function summarizeModuleReadiness(
  module: ModuleWithStructure,
  competitors: CompetitionCompetitor[],
  requiredJudgementMarks: number,
) {
  const readiness = competitors.map((competitor) =>
    checkCompetitorModuleReadiness(competitor, module, requiredJudgementMarks),
  );
  const hasInconsistencies = readiness.some((item) => item.inconsistencies.length > 0);
  const hasAnyMark = readiness.some((item) => item.lockedMarks + item.unlockedMarks > 0);
  const totalUnlockedMarks = readiness.reduce((total, item) => total + item.unlockedMarks, 0);
  const totalLockedMarks = readiness.reduce((total, item) => total + item.lockedMarks, 0);
  const status = getModuleStatus({
    hasAnyMark,
    hasInconsistencies,
    totalUnlockedMarks,
    totalLockedMarks,
  });

  return {
    readiness,
    status,
    canLockCollectively: status === "READY_TO_LOCK",
    totalCompetitors: competitors.length,
    readyCompetitors: readiness.filter((item) => item.status === "READY_TO_LOCK" || item.status === "LOCKED").length,
    blockedCompetitors: readiness.filter((item) => item.status === "LOCKED").length,
    pendingCompetitors: readiness.filter((item) => item.inconsistencies.length > 0).length,
    totalAspects: readiness.reduce((total, item) => total + item.totalAspects, 0),
    markedAspects: readiness.reduce((total, item) => total + item.markedAspects, 0),
    missingAspects: readiness.reduce((total, item) => total + item.missingAspects, 0),
    judgementReviewCount: readiness.reduce((total, item) => total + item.judgementReviewCount, 0),
    incompleteJudgementCount: readiness.reduce((total, item) => total + item.incompleteJudgementCount, 0),
    unlockedMarks: totalUnlockedMarks,
    lockedMarks: totalLockedMarks,
  };
}

function getModuleStatus(params: {
  hasAnyMark: boolean;
  hasInconsistencies: boolean;
  totalUnlockedMarks: number;
  totalLockedMarks: number;
}): CollectiveModuleStatus {
  if (!params.hasAnyMark) {
    return "NOT_STARTED";
  }

  if (params.hasInconsistencies) {
    return "HAS_INCONSISTENCIES";
  }

  if (params.totalLockedMarks > 0 && params.totalUnlockedMarks === 0) {
    return "LOCKED";
  }

  if (params.totalUnlockedMarks > 0) {
    return "READY_TO_LOCK";
  }

  return "IN_PROGRESS";
}

export async function getCollectiveModuleClosingStatus(competitionId: number) {
  const [competition, competitors, modules] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true },
    }),
    loadCompetitionCompetitors(competitionId),
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
                        competitor: {
                          select: {
                            competitionId: true,
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
    throw new ModuleClosingServiceError(404, "Competition not found");
  }

  const { requiredJudgementMarks } = await getRequiredJudgementMarks(competitionId);

  return {
    competition,
    modules: modules.map((module) => {
      const summary = summarizeModuleReadiness(module, competitors, requiredJudgementMarks);

      return {
        id: module.id,
        code: module.code,
        name: module.name,
        totalCompetitors: summary.totalCompetitors,
        readyCompetitors: summary.readyCompetitors,
        blockedCompetitors: summary.blockedCompetitors,
        pendingCompetitors: summary.pendingCompetitors,
        totalAspects: summary.totalAspects,
        markedAspects: summary.markedAspects,
        missingAspects: summary.missingAspects,
        judgementReviewCount: summary.judgementReviewCount,
        incompleteJudgementCount: summary.incompleteJudgementCount,
        unlockedMarks: summary.unlockedMarks,
        lockedMarks: summary.lockedMarks,
        status: summary.status,
        canLockCollectively: summary.canLockCollectively,
      };
    }),
  };
}

export async function getCollectiveModuleClosingDetails(competitionId: number, moduleId: number) {
  const [competition, competitors, module] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true },
    }),
    loadCompetitionCompetitors(competitionId),
    loadModuleWithStructure(moduleId),
  ]);

  if (!competition) {
    throw new ModuleClosingServiceError(404, "Competition not found");
  }

  if (!module || module.competitionId !== competitionId) {
    throw new ModuleClosingServiceError(404, "Module not found");
  }

  const { requiredJudgementMarks } = await getRequiredJudgementMarks(competitionId);
  const summary = summarizeModuleReadiness(module, competitors, requiredJudgementMarks);

  return {
    module: {
      id: module.id,
      code: module.code,
      name: module.name,
    },
    summary: {
      totalCompetitors: summary.totalCompetitors,
      readyCompetitors: summary.readyCompetitors,
      pendingCompetitors: summary.pendingCompetitors,
      canLockCollectively: summary.canLockCollectively,
    },
    competitors: summary.readiness,
  };
}

export async function lockModuleCollectively(params: {
  competitionId: number;
  moduleId: number;
  userName?: string | undefined;
}) {
  const details = await getCollectiveModuleClosingDetails(params.competitionId, params.moduleId);

  if (!details.summary.canLockCollectively) {
    throw new ModuleClosingServiceError(
      409,
      "O módulo não pode ser bloqueado coletivamente porque existem inconsistências.",
      buildConflictDetails(details.competitors),
    );
  }

  return setModuleMarksCollectiveLock({
    competitionId: params.competitionId,
    moduleId: params.moduleId,
    locked: true,
    userName: params.userName,
  });
}

export async function unlockModuleCollectively(params: {
  competitionId: number;
  moduleId: number;
  userName?: string | undefined;
}) {
  await getCollectiveModuleClosingDetails(params.competitionId, params.moduleId);

  return setModuleMarksCollectiveLock({
    competitionId: params.competitionId,
    moduleId: params.moduleId,
    locked: false,
    userName: params.userName,
  });
}

function buildConflictDetails(competitors: CompetitorModuleReadiness[]) {
  return competitors.flatMap((competitor) =>
    competitor.inconsistencies.map((item) => ({
      competitorName: competitor.name,
      workstation: competitor.workstation,
      type: item.type,
      aspectCode: item.aspectCode,
      reason: item.reason,
    })),
  );
}

async function setModuleMarksCollectiveLock(params: {
  competitionId: number;
  moduleId: number;
  locked: boolean;
  userName?: string | undefined;
}) {
  const module = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: {
      criteria: {
        include: {
          subCriteria: {
            include: {
              aspects: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!module || module.competitionId !== params.competitionId) {
    throw new ModuleClosingServiceError(404, "Module not found");
  }

  const aspectIds = module.criteria.flatMap((criterion) =>
    criterion.subCriteria.flatMap((subCriterion) => subCriterion.aspects.map((aspect) => aspect.id)),
  );

  const where = {
    aspectId: {
      in: aspectIds.length > 0 ? aspectIds : [0],
    },
    competitor: {
      competitionId: params.competitionId,
    },
  };
  const previousMarks = await prisma.mark.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      competitor: {
        select: {
          id: true,
        },
      },
    },
  });
  const marksToChange = previousMarks.filter((mark) => mark.locked !== params.locked);

  if (marksToChange.length > 0) {
    await prisma.mark.updateMany({
      where: {
        id: {
          in: marksToChange.map((mark) => mark.id),
        },
      },
      data: {
        locked: params.locked,
      },
    });
  }

  const affectedCompetitors = new Set(marksToChange.map((mark) => mark.competitor.id)).size;
  const lockedBefore = previousMarks.filter((mark) => mark.locked).length;
  const unlockedBefore = previousMarks.filter((mark) => !mark.locked).length;

  await prisma.auditLog.create({
    data: {
      competitionId: params.competitionId,
      userName: params.userName || "system",
      entity: "ModuleCollectiveLock",
      entityId: String(params.moduleId),
      action: params.locked ? AuditAction.LOCK : AuditAction.UNLOCK,
      oldValue: JSON.stringify(
        params.locked
          ? { unlockedMarksBefore: unlockedBefore }
          : { lockedMarksBefore: lockedBefore },
      ),
      newValue: JSON.stringify(
        params.locked
          ? { lockedMarks: marksToChange.length, affectedCompetitors }
          : { unlockedMarks: marksToChange.length, affectedCompetitors },
      ),
    },
  });

  return params.locked
    ? {
        message: "Módulo bloqueado coletivamente com sucesso.",
        moduleId: params.moduleId,
        lockedMarks: marksToChange.length,
        affectedCompetitors,
      }
    : {
        message: "Módulo desbloqueado coletivamente com sucesso.",
        moduleId: params.moduleId,
        unlockedMarks: marksToChange.length,
        affectedCompetitors,
      };
}

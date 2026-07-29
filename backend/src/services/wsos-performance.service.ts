import { prisma } from "../lib/prisma.js";
import { calculateCompetitionResult, roundScore } from "./results.service.js";

const missingWsosLabel = "WSOS não informado";

const wsosNames: Record<string, string> = {
  "1": "Organização e gerenciamento do trabalho",
  "2": "Comunicação e habilidades interpessoais",
  "3": "Design de websites",
  "4": "Layout de websites",
  "5": "Desenvolvimento front-end",
  "6": "Desenvolvimento back-end",
};

export class WsosPerformanceServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeWsosList(wsos: string | null | undefined): string[] {
  const trimmedWsos = wsos?.trim();

  if (!trimmedWsos) {
    return [missingWsosLabel];
  }

  const parts = trimmedWsos
    .split(/[,;/]+/)
    .map((part) => normalizeWsosName(part.trim()))
    .filter(Boolean);

  return [...new Set(parts.length > 0 ? parts : [missingWsosLabel])];
}

function normalizeWsosName(value: string) {
  if (!value) {
    return missingWsosLabel;
  }

  const normalized = value.replace(/^wsos\s*/i, "").trim();
  const numericMatch = normalized.match(/^(\d+)(?:\s*[.-]\s*)?(.*)$/);

  if (numericMatch?.[1]) {
    const code = numericMatch[1];
    const description = numericMatch[2]?.trim();

    return description || wsosNames[code] || `WSOS ${code}`;
  }

  return value;
}

function compareWsos(a: string, b: string) {
  const numericA = getWsosNumber(a);
  const numericB = getWsosNumber(b);

  if (numericA !== null && numericB !== null) {
    return numericA - numericB;
  }

  if (numericA !== null) {
    return -1;
  }

  if (numericB !== null) {
    return 1;
  }

  return a.localeCompare(b, "pt-BR");
}

function getWsosNumber(value: string) {
  const entry = Object.entries(wsosNames).find(([, name]) => name === value);

  if (entry) {
    return Number(entry[0]);
  }

  const match = value.match(/^WSOS\s*(\d+)$/i) ?? value.match(/^(\d+)/);

  return match?.[1] ? Number(match[1]) : null;
}

function percentage(score: number, maxPoints: number) {
  return maxPoints > 0 ? roundScore((score / maxPoints) * 100) : 0;
}

export async function calculateWsosPerformance(competitionId: number, competitorId: number) {
  const [competition, competitor] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true },
    }),
    prisma.competitor.findUnique({
      where: { id: competitorId },
      select: {
        id: true,
        competitionId: true,
        name: true,
        state: true,
        workstation: true,
      },
    }),
  ]);

  if (!competition) {
    throw new WsosPerformanceServiceError(404, "Competição não encontrada.");
  }

  if (!competitor) {
    throw new WsosPerformanceServiceError(404, "Competidor não encontrado.");
  }

  if (competitor.competitionId !== competitionId) {
    throw new WsosPerformanceServiceError(400, "Competidor não pertence à competição.");
  }

  const result = await calculateCompetitionResult(competitionId, competitorId);
  const groups = new Map<string, { score: number; maxPoints: number }>();

  for (const module of result.modules) {
    for (const criterion of module.criteria) {
      for (const subCriterion of criterion.subCriteria) {
        for (const aspect of subCriterion.aspects) {
          const wsosList = normalizeWsosList(aspect.wsos);
          const divisor = wsosList.length || 1;

          for (const wsos of wsosList) {
            const current = groups.get(wsos) ?? { score: 0, maxPoints: 0 };
            current.score += aspect.score / divisor;
            current.maxPoints += aspect.maxPoints / divisor;
            groups.set(wsos, current);
          }
        }
      }
    }
  }

  const items = [...groups.entries()]
    .map(([wsos, values]) => ({
      wsos,
      score: roundScore(values.score),
      maxPoints: roundScore(values.maxPoints),
      percentage: percentage(values.score, values.maxPoints),
    }))
    .sort((a, b) => compareWsos(a.wsos, b.wsos));

  const score = roundScore(items.reduce((total, item) => total + item.score, 0));
  const maxPoints = roundScore(items.reduce((total, item) => total + item.maxPoints, 0));

  return {
    competition,
    competitor: {
      id: competitor.id,
      name: competitor.name,
      state: competitor.state,
      workstation: competitor.workstation,
    },
    items,
    summary: {
      score,
      maxPoints,
      percentage: percentage(score, maxPoints),
    },
  };
}

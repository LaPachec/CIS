import { AspectType } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { competitorBelongsToCompetition } from "./competition-memberships.service.js";
import { getRequiredJudgementMarks } from "./judgement-rules.service.js";

type ScoreValue = number | string | { toString: () => string };

type AspectForScore = {
  type: AspectType;
  maxPoints: ScoreValue;
};

type MarkForScore = {
  value: ScoreValue;
} | null;

type LoadedMark = {
  id: number;
  aspectId: number;
  expertId: number;
  value: ScoreValue;
  observation: string | null;
  locked: boolean;
  updatedAt: Date;
  expert: {
    id: number;
    name: string;
  };
};

export class ResultsServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: ScoreValue) {
  return Number(value);
}

function calculatePercentage(score: number, maxPoints: number) {
  if (maxPoints <= 0) {
    return 0;
  }

  return roundScore((score / maxPoints) * 100);
}

function mapMark(mark: LoadedMark) {
  return {
    id: mark.id,
    expertId: mark.expertId,
    expertName: mark.expert.name,
    value: roundScore(toNumber(mark.value)),
    observation: mark.observation,
    locked: mark.locked,
  };
}

function selectMeasurementMark(marks: LoadedMark[]) {
  const lockedMarks = marks.filter((mark) => mark.locked);
  const candidates = lockedMarks.length > 0 ? lockedMarks : marks;

  return [...candidates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
}

export function calculateAspectScore(aspect: AspectForScore, mark: MarkForScore) {
  if (!mark) {
    return 0;
  }

  if (aspect.type === AspectType.MEASUREMENT) {
    return roundScore(toNumber(mark.value));
  }

  return roundScore((toNumber(mark.value) / 3) * toNumber(aspect.maxPoints));
}

function calculateConsolidatedAspectResult(aspect: {
  id: number;
  code: string;
  description: string;
  wsos?: string | null;
  type: AspectType;
  maxPoints: ScoreValue;
}, marks: LoadedMark[], requiredJudgementMarks: number) {
  const maxPoints = roundScore(toNumber(aspect.maxPoints));

  if (aspect.type === AspectType.MEASUREMENT) {
    const officialMark = selectMeasurementMark(marks);
    const score = calculateAspectScore(aspect, officialMark);
    const isMarked = marks.length > 0;

    return {
      id: aspect.id,
      code: aspect.code,
      description: aspect.description,
      wsos: aspect.wsos ?? null,
      type: aspect.type,
      maxPoints,
      markValue: officialMark ? roundScore(toNumber(officialMark.value)) : null,
      score,
      isMarked,
      marksCount: marks.length,
      completedForOfficialResult: isMarked,
      judgementValues: [],
      judgementAverage: null,
      judgementDifference: null,
      status: "OK",
      needsReview: false,
      marks: officialMark ? [mapMark(officialMark)] : [],
    };
  }

  const validJudgementMarks = marks.filter((mark) => {
    const value = toNumber(mark.value);

    return Number.isInteger(value) && value >= 0 && value <= 3;
  });
  const judgementValues = validJudgementMarks.map((mark) => toNumber(mark.value));
  const marksCount = judgementValues.length;
  const isMarked = marksCount > 0;
  const judgementAverage = isMarked
    ? judgementValues.reduce((total, value) => total + value, 0) / marksCount
    : null;
  const judgementDifference = isMarked ? Math.max(...judgementValues) - Math.min(...judgementValues) : null;
  const needsReview = judgementDifference !== null && judgementDifference > 1;
  const score = judgementAverage === null ? 0 : roundScore((judgementAverage / 3) * maxPoints);

  return {
    id: aspect.id,
    code: aspect.code,
    description: aspect.description,
    wsos: aspect.wsos ?? null,
    type: aspect.type,
    maxPoints,
    markValue: judgementAverage === null ? null : roundScore(judgementAverage),
    score,
    isMarked,
    marksCount,
    completedForOfficialResult: marksCount >= requiredJudgementMarks,
    requiredJudgementMarks,
    judgementValues: judgementValues.map(roundScore),
    judgementAverage: judgementAverage === null ? null : roundScore(judgementAverage),
    judgementDifference: judgementDifference === null ? null : roundScore(judgementDifference),
    status: needsReview ? "REVIEW_REQUIRED" : "OK",
    needsReview,
    marks: validJudgementMarks.map(mapMark),
  };
}

export async function calculateModuleResult(competitorId: number, moduleId: number) {
  const [competitor, module] = await Promise.all([
    prisma.competitor.findUnique({
      where: { id: competitorId },
    }),
    prisma.module.findUnique({
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
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!competitor) {
    throw new ResultsServiceError("Competitor not found", 404);
  }

  if (!module) {
    throw new ResultsServiceError("Module not found", 404);
  }

  if (!(await competitorBelongsToCompetition(competitorId, module.competitionId))) {
    throw new ResultsServiceError("Module and competitor must belong to the same competition", 400);
  }

  const aspectIds = module.criteria.flatMap((criterion) =>
    criterion.subCriteria.flatMap((subCriterion) => subCriterion.aspects.map((aspect) => aspect.id)),
  );

  const marks = await prisma.mark.findMany({
    where: {
      competitorId,
      aspectId: {
        in: aspectIds.length > 0 ? aspectIds : [0],
      },
    },
    include: {
      expert: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  const { requiredJudgementMarks } = await getRequiredJudgementMarks(module.competitionId);
  const marksByAspectId = new Map<number, LoadedMark[]>();

  for (const mark of marks) {
    const aspectMarks = marksByAspectId.get(mark.aspectId) ?? [];
    aspectMarks.push(mark);
    marksByAspectId.set(mark.aspectId, aspectMarks);
  }

  let moduleScore = 0;
  let completedAspects = 0;
  const totalAspects = aspectIds.length;

  const criteria = module.criteria.map((criterion) => {
    let criterionScore = 0;

    const subCriteria = criterion.subCriteria.map((subCriterion) => {
      let subCriterionScore = 0;
      let subCriterionMaxPoints = 0;

      const aspects = subCriterion.aspects.map((aspect) => {
        const aspectMarks = marksByAspectId.get(aspect.id) ?? [];
        const result = calculateConsolidatedAspectResult(aspect, aspectMarks, requiredJudgementMarks);

        if (result.isMarked) {
          completedAspects += 1;
        }

        subCriterionScore += result.score;
        subCriterionMaxPoints += toNumber(aspect.maxPoints);

        return result;
      });

      criterionScore += subCriterionScore;

      return {
        id: subCriterion.id,
        code: subCriterion.code,
        name: subCriterion.name,
        score: roundScore(subCriterionScore),
        maxPoints: roundScore(subCriterionMaxPoints),
        aspects,
      };
    });

    moduleScore += criterionScore;

    return {
      id: criterion.id,
      code: criterion.code,
      name: criterion.name,
      score: roundScore(criterionScore),
      maxPoints: roundScore(toNumber(criterion.totalPoints)),
      subCriteria,
    };
  });

  const maxPoints = roundScore(toNumber(module.totalPoints));
  const score = roundScore(moduleScore);

  return {
    competitor,
    module: {
      id: module.id,
      competitionId: module.competitionId,
      code: module.code,
      name: module.name,
      description: module.description,
      totalPoints: maxPoints,
    },
    score,
    maxPoints,
    percentage: calculatePercentage(score, maxPoints),
    completedAspects,
    totalAspects,
    missingAspects: totalAspects - completedAspects,
    criteria,
  };
}

export async function calculateCompetitionResult(competitionId: number, competitorId: number) {
  const [competition, competitor, modules] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId } }),
    prisma.competitor.findUnique({ where: { id: competitorId } }),
    prisma.module.findMany({
      where: { competitionId },
      orderBy: { code: "asc" },
    }),
  ]);

  if (!competition) {
    throw new ResultsServiceError("Competition not found", 404);
  }

  if (!competitor) {
    throw new ResultsServiceError("Competitor not found", 404);
  }

  if (!(await competitorBelongsToCompetition(competitorId, competitionId))) {
    throw new ResultsServiceError("Competitor does not belong to this competition", 400);
  }

  const moduleResults = await Promise.all(modules.map((module) => calculateModuleResult(competitorId, module.id)));

  const score = roundScore(moduleResults.reduce((total, module) => total + module.score, 0));
  const maxPoints = roundScore(moduleResults.reduce((total, module) => total + module.maxPoints, 0));

  return {
    competition,
    competitor,
    score,
    maxPoints,
    percentage: calculatePercentage(score, maxPoints),
    completedAspects: moduleResults.reduce((total, module) => total + module.completedAspects, 0),
    totalAspects: moduleResults.reduce((total, module) => total + module.totalAspects, 0),
    missingAspects: moduleResults.reduce((total, module) => total + module.missingAspects, 0),
    modules: moduleResults.map((moduleResult) => ({
      module: moduleResult.module,
      score: moduleResult.score,
      maxPoints: moduleResult.maxPoints,
      percentage: moduleResult.percentage,
      completedAspects: moduleResult.completedAspects,
      totalAspects: moduleResult.totalAspects,
      missingAspects: moduleResult.missingAspects,
      criteria: moduleResult.criteria,
    })),
  };
}

export async function calculateRanking(competitionId: number) {
  const [competition, competitors] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId } }),
    prisma.competitor.findMany({
      where: { competitionLinks: { some: { competitionId } } },
      orderBy: [{ workstation: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!competition) {
    throw new ResultsServiceError("Competition not found", 404);
  }

  const results = await Promise.all(
    competitors.map((competitor) => calculateCompetitionResult(competitionId, competitor.id)),
  );

  return results
    .sort((a, b) => b.score - a.score || a.competitor.name.localeCompare(b.competitor.name))
    .map((result, index) => ({
      position: index + 1,
      competitor: result.competitor,
      score: result.score,
      maxPoints: result.maxPoints,
      percentage: result.percentage,
      completedAspects: result.completedAspects,
      totalAspects: result.totalAspects,
      missingAspects: result.missingAspects,
      modules: result.modules,
    }));
}

import { AspectType } from "../../generated/prisma/enums.js";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { calculateCompetitionResult, roundScore } from "../services/results.service.js";
import { parsePositiveInt, sendData, sendError } from "./helpers.js";

type SubCriterionStatus = "EMPTY" | "PARTIAL" | "COMPLETE" | "REVIEW_REQUIRED" | "LOCKED";
type ModuleStatus = "EMPTY" | "PARTIAL" | "COMPLETE" | "REVIEW_REQUIRED" | "LOCKED";

function toNumber(value: number | string | { toString: () => string }) {
  return Number(value);
}

function getJudgementDifference(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function getSubCriterionStatus(params: {
  totalAspects: number;
  markedAspects: number;
  hasReview: boolean;
  lockedMarks: number;
  unlockedMarks: number;
}): SubCriterionStatus {
  if (params.hasReview) {
    return "REVIEW_REQUIRED";
  }

  if (params.lockedMarks > 0 && params.unlockedMarks === 0 && params.markedAspects === params.totalAspects) {
    return "LOCKED";
  }

  if (params.markedAspects === 0) {
    return "EMPTY";
  }

  if (params.markedAspects < params.totalAspects) {
    return "PARTIAL";
  }

  return "COMPLETE";
}

function getModuleStatus(params: {
  totalAspects: number;
  markedAspects: number;
  missingAspects: number;
  judgementReviewCount: number;
  lockedMarks: number;
  unlockedMarks: number;
}): ModuleStatus {
  if (params.judgementReviewCount > 0) {
    return "REVIEW_REQUIRED";
  }

  if (params.markedAspects === 0) {
    return "EMPTY";
  }

  if (params.missingAspects > 0) {
    return "PARTIAL";
  }

  if (params.lockedMarks > 0 && params.unlockedMarks === 0 && params.markedAspects === params.totalAspects) {
    return "LOCKED";
  }

  return "COMPLETE";
}

export async function calculateModuleCheck(competitorId: number, moduleId: number) {
  const [competitor, module] = await Promise.all([
    prisma.competitor.findUnique({ where: { id: competitorId } }),
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
                  include: {
                    marks: {
                      where: { competitorId },
                      include: {
                        expert: {
                          select: {
                            id: true,
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

  if (!competitor) {
    return { error: "Competitor not found" as const, statusCode: 404 as const };
  }

  if (!module) {
    return { error: "Module not found" as const, statusCode: 404 as const };
  }

  if (competitor.competitionId !== module.competitionId) {
    return { error: "Competitor and module must belong to the same competition" as const, statusCode: 400 as const };
  }

  const missing: Array<{
    subCriterionCode: string;
    aspectCode: string;
    description: string;
  }> = [];
  const needsReview: Array<{
    subCriterionCode: string;
    aspectCode: string;
    description: string;
    values: number[];
    difference: number;
  }> = [];
  let totalAspects = 0;
  let markedAspects = 0;
  let lockedMarks = 0;
  let unlockedMarks = 0;

  const subCriteria = module.criteria.flatMap((criterion) =>
    criterion.subCriteria.map((subCriterion) => {
      let subCriterionMarkedAspects = 0;
      let subCriterionLockedMarks = 0;
      let subCriterionUnlockedMarks = 0;
      let subCriterionHasReview = false;

      for (const aspect of subCriterion.aspects) {
        totalAspects += 1;

        const aspectMarks = aspect.marks;
        const hasMark = aspectMarks.length > 0;

        if (hasMark) {
          markedAspects += 1;
          subCriterionMarkedAspects += 1;
        } else {
          missing.push({
            subCriterionCode: subCriterion.code,
            aspectCode: aspect.code,
            description: aspect.description,
          });
        }

        for (const mark of aspectMarks) {
          if (mark.locked) {
            lockedMarks += 1;
            subCriterionLockedMarks += 1;
          } else {
            unlockedMarks += 1;
            subCriterionUnlockedMarks += 1;
          }
        }

        if (aspect.type === AspectType.JUDGEMENT) {
          const values = aspectMarks
            .map((mark) => toNumber(mark.value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value <= 3);
          const difference = getJudgementDifference(values);

          if (values.length > 0 && difference > 1) {
            subCriterionHasReview = true;
            needsReview.push({
              subCriterionCode: subCriterion.code,
              aspectCode: aspect.code,
              description: aspect.description,
              values,
              difference,
            });
          }
        }
      }

      return {
        id: subCriterion.id,
        code: subCriterion.code,
        name: subCriterion.name,
        totalAspects: subCriterion.aspects.length,
        markedAspects: subCriterionMarkedAspects,
        missingAspects: subCriterion.aspects.length - subCriterionMarkedAspects,
        lockedMarks: subCriterionLockedMarks,
        unlockedMarks: subCriterionUnlockedMarks,
        status: getSubCriterionStatus({
          totalAspects: subCriterion.aspects.length,
          markedAspects: subCriterionMarkedAspects,
          hasReview: subCriterionHasReview,
          lockedMarks: subCriterionLockedMarks,
          unlockedMarks: subCriterionUnlockedMarks,
        }),
      };
    }),
  );

  const missingAspects = totalAspects - markedAspects;
  const judgementAspectsNeedingReview = needsReview.length;
  const status = getModuleStatus({
    totalAspects,
    markedAspects,
    missingAspects,
    judgementReviewCount: judgementAspectsNeedingReview,
    lockedMarks,
    unlockedMarks,
  });

  return {
    competitor,
    module: {
      id: module.id,
      competitionId: module.competitionId,
      code: module.code,
      name: module.name,
      description: module.description,
      totalPoints: module.totalPoints,
    },
    summary: {
      totalAspects,
      markedAspects,
      missingAspects,
      lockedMarks,
      unlockedMarks,
      judgementAspectsNeedingReview,
      canLockModule: missingAspects === 0 && judgementAspectsNeedingReview === 0 && status !== "LOCKED",
      status,
    },
    missing,
    needsReview,
    subCriteria,
  };
}

type ModuleCheckResult = Exclude<Awaited<ReturnType<typeof calculateModuleCheck>>, { error: string }>;

function isModuleCheckResult(check: Awaited<ReturnType<typeof calculateModuleCheck>>): check is ModuleCheckResult {
  return !("error" in check);
}

export async function calculateFinalCheck(competitionId: number) {
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
    }),
  ]);

  if (!competition) {
    return { error: "Competition not found" as const, statusCode: 404 as const };
  }

  const competitorsResult = await Promise.all(
    competitors.map(async (competitor) => {
      const [competitionResult, moduleChecks] = await Promise.all([
        calculateCompetitionResult(competitionId, competitor.id),
        Promise.all(modules.map((module) => calculateModuleCheck(competitor.id, module.id))),
      ]);
      const validChecks = moduleChecks.filter(isModuleCheckResult);
      const completeModules = validChecks.filter(
        (check) => check.summary.status === "COMPLETE" || check.summary.status === "LOCKED",
      ).length;
      const lockedModules = validChecks.filter((check) => check.summary.status === "LOCKED").length;
      const missingAspects = validChecks.reduce((total, check) => total + check.summary.missingAspects, 0);
      const judgementReviewCount = validChecks.reduce(
        (total, check) => total + check.summary.judgementAspectsNeedingReview,
        0,
      );
      const status = judgementReviewCount > 0 || missingAspects > 0 || lockedModules < modules.length ? "PENDING" : "READY";

      return {
        id: competitor.id,
        name: competitor.name,
        state: competitor.state,
        workstation: competitor.workstation,
        summary: {
          score: competitionResult.score,
          maxPoints: competitionResult.maxPoints,
          percentage: competitionResult.percentage,
          completeModules,
          incompleteModules: modules.length - completeModules,
          lockedModules,
          missingAspects,
          judgementReviewCount,
          status,
        },
        modules: validChecks.map((check) => {
          const resultModule = competitionResult.modules.find((moduleResult) => moduleResult.module.id === check.module.id);
          const score = resultModule?.score ?? 0;
          const maxPoints = resultModule?.maxPoints ?? roundScore(toNumber(check.module.totalPoints));

          return {
            id: check.module.id,
            code: check.module.code,
            name: check.module.name,
            score,
            maxPoints,
            percentage: maxPoints > 0 ? roundScore((score / maxPoints) * 100) : 0,
            totalAspects: check.summary.totalAspects,
            markedAspects: check.summary.markedAspects,
            missingAspects: check.summary.missingAspects,
            lockedMarks: check.summary.lockedMarks,
            unlockedMarks: check.summary.unlockedMarks,
            judgementReviewCount: check.summary.judgementAspectsNeedingReview,
            status: check.summary.status,
            canLockModule: check.summary.canLockModule,
          };
        }),
      };
    }),
  );

  const totalExpectedModules = competitors.length * modules.length;
  const completeModules = competitorsResult.reduce((total, competitor) => total + competitor.summary.completeModules, 0);
  const lockedModules = competitorsResult.reduce((total, competitor) => total + competitor.summary.lockedModules, 0);
  const totalAspects = competitorsResult.reduce(
    (total, competitor) => total + competitor.modules.reduce((sum, module) => sum + module.totalAspects, 0),
    0,
  );
  const markedAspects = competitorsResult.reduce(
    (total, competitor) => total + competitor.modules.reduce((sum, module) => sum + module.markedAspects, 0),
    0,
  );
  const missingAspects = competitorsResult.reduce((total, competitor) => total + competitor.summary.missingAspects, 0);
  const judgementReviewCount = competitorsResult.reduce(
    (total, competitor) => total + competitor.summary.judgementReviewCount,
    0,
  );
  const canCloseCompetition =
    totalExpectedModules > 0 &&
    completeModules === totalExpectedModules &&
    missingAspects === 0 &&
    judgementReviewCount === 0 &&
    lockedModules === totalExpectedModules;

  return {
    competition,
    summary: {
      competitorsCount: competitors.length,
      modulesCount: modules.length,
      totalExpectedModules,
      completeModules,
      incompleteModules: totalExpectedModules - completeModules,
      lockedModules,
      unlockedModules: totalExpectedModules - lockedModules,
      totalAspects,
      markedAspects,
      missingAspects,
      judgementReviewCount,
      canCloseCompetition,
    },
    competitors: competitorsResult,
  };
}

export async function checksRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/checks/final", async (request, reply) => {
    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    const finalCheck = await calculateFinalCheck(competitionId);

    if ("error" in finalCheck) {
      return sendError(reply, finalCheck.statusCode ?? 500, finalCheck.error);
    }

    return sendData(reply, finalCheck);
  });

  app.get<{ Params: { competitorId: string; moduleId: string } }>(
    "/checks/competitors/:competitorId/modules/:moduleId",
    async (request, reply) => {
      const competitorId = parsePositiveInt(request.params.competitorId);
      const moduleId = parsePositiveInt(request.params.moduleId);

      if (!competitorId) {
        return sendError(reply, 400, "Invalid competitor id");
      }

      if (!moduleId) {
        return sendError(reply, 400, "Invalid module id");
      }

      const check = await calculateModuleCheck(competitorId, moduleId);

      if ("error" in check) {
        return sendError(reply, check.statusCode ?? 500, check.error);
      }

      return sendData(reply, check);
    },
  );
}

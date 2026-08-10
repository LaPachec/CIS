import { ExpertRole } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

export async function syncCompetitorCompetitions(competitorId: number, competitionIds: number[]) {
  const uniqueCompetitionIds = [...new Set(competitionIds)].filter((id) => Number.isInteger(id) && id > 0);

  await prisma.$transaction([
    prisma.competitionCompetitor.deleteMany({
      where: {
        competitorId,
        competitionId: { notIn: uniqueCompetitionIds },
      },
    }),
    ...uniqueCompetitionIds.map((competitionId) =>
      prisma.competitionCompetitor.upsert({
        where: {
          competitionId_competitorId: {
            competitionId,
            competitorId,
          },
        },
        update: {},
        create: {
          competitionId,
          competitorId,
        },
      }),
    ),
  ]);
}

export async function syncExpertCompetitions(expertId: number, competitionIds: number[]) {
  const uniqueCompetitionIds = [...new Set(competitionIds)].filter((id) => Number.isInteger(id) && id > 0);

  await prisma.$transaction([
    prisma.competitionExpert.deleteMany({
      where: {
        expertId,
        competitionId: { notIn: uniqueCompetitionIds },
      },
    }),
    ...uniqueCompetitionIds.map((competitionId) =>
      prisma.competitionExpert.upsert({
        where: {
          competitionId_expertId: {
            competitionId,
            expertId,
          },
        },
        update: {},
        create: {
          competitionId,
          expertId,
        },
      }),
    ),
  ]);
}

export async function competitorBelongsToCompetition(competitorId: number, competitionId: number) {
  const link = await prisma.competitionCompetitor.findUnique({
    where: {
      competitionId_competitorId: {
        competitionId,
        competitorId,
      },
    },
    select: { id: true },
  });

  if (link) {
    return true;
  }

  const legacyCompetitor = await prisma.competitor.findFirst({
    where: { id: competitorId, competitionId },
    select: { id: true },
  });

  return Boolean(legacyCompetitor);
}

export async function expertBelongsToCompetition(expertId: number, competitionId: number, userRole?: string) {
  if (userRole === ExpertRole.ADMIN) {
    return true;
  }

  const link = await prisma.competitionExpert.findUnique({
    where: {
      competitionId_expertId: {
        competitionId,
        expertId,
      },
    },
    select: { id: true },
  });

  if (link) {
    return true;
  }

  const legacyExpert = await prisma.expert.findFirst({
    where: { id: expertId, competitionId },
    select: { id: true },
  });

  return Boolean(legacyExpert);
}

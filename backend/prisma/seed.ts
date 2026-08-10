import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { AspectType, ExpertRole } from "../generated/prisma/enums.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi configurada.");
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });
const resetMarks = process.argv.includes("--reset-marks");

const competitionData = {
  name: "Simulado Estadual Paraná 2026",
  location: "Paraná",
  startDate: new Date("2026-07-20T00:00:00.000Z"),
  endDate: new Date("2026-07-22T00:00:00.000Z"),
};

const expertSeeds = [
  { name: "Ana Martins", state: "PR", role: ExpertRole.EXPERT },
  { name: "Bruno Almeida", state: "PR", role: ExpertRole.EXPERT },
  { name: "Carla Souza", state: "PR", role: ExpertRole.EXPERT },
  { name: "Diego Ferreira", state: "PR", role: ExpertRole.EXPERT },
  { name: "Fernanda Lima", state: "PR", role: ExpertRole.EXPERT },
  { name: "Supervisor Geral", state: "PR", role: ExpertRole.SUPERVISOR },
  { name: "Administrador do Sistema", state: "PR", role: ExpertRole.ADMIN },
];

const competitorSeeds = [
  { name: "Competidor 01", state: "PR", workstation: "PR01" },
  { name: "Competidor 02", state: "SC", workstation: "SC01" },
  { name: "Competidor 03", state: "RS", workstation: "RS01" },
];

const observations = [
  "Atendeu ao requisito esperado.",
  "Necessário revisar alinhamento visual.",
  "Funcionalidade parcialmente consistente.",
  "Resultado apresentado conforme solicitado.",
  "Diferença de julgamento criada para teste de conferência.",
];

type SeedCounters = {
  expertsCreated: number;
  expertsReused: number;
  competitorsCreated: number;
  competitorsReused: number;
  marksCreated: number;
  marksSkipped: number;
};

async function main() {
  const counters: SeedCounters = {
    expertsCreated: 0,
    expertsReused: 0,
    competitorsCreated: 0,
    competitorsReused: 0,
    marksCreated: 0,
    marksSkipped: 0,
  };

  const competition = await findOrCreateCompetition();
  const expertsByName = await seedExperts(competition.id, counters);
  const competitors = await seedCompetitors(competition.id, counters);

  if (resetMarks) {
    await prisma.mark.deleteMany({
      where: {
        competitor: {
          competitionId: competition.id,
        },
      },
    });
  }

  const modules = await prisma.module.findMany({
    where: { competitionId: competition.id },
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
              },
            },
          },
        },
      },
    },
  });

  const ana = expertsByName.get("Ana Martins");
  const bruno = expertsByName.get("Bruno Almeida");
  const carla = expertsByName.get("Carla Souza");

  if (ana && bruno && carla) {
    for (const competitor of competitors) {
      for (const module of modules) {
        for (const criterion of module.criteria) {
          for (const subCriterion of criterion.subCriteria) {
            for (const aspect of subCriterion.aspects) {
              if (aspect.type === AspectType.MEASUREMENT) {
                await createMarkIfMissing({
                  aspectId: aspect.id,
                  competitorId: competitor.id,
                  expertId: ana.id,
                  value: getMeasurementValue(aspect.maxPoints, aspect.id, competitor.id),
                  observation: getObservation(aspect.id, competitor.id, ana.id),
                  counters,
                });
              } else {
                const values = getJudgementValues(aspect.id, competitor.id);

                await createMarkIfMissing({
                  aspectId: aspect.id,
                  competitorId: competitor.id,
                  expertId: ana.id,
                  value: values[0],
                  observation: getObservation(aspect.id, competitor.id, ana.id),
                  counters,
                });
                await createMarkIfMissing({
                  aspectId: aspect.id,
                  competitorId: competitor.id,
                  expertId: bruno.id,
                  value: values[1],
                  observation: getObservation(aspect.id, competitor.id, bruno.id),
                  counters,
                });
                await createMarkIfMissing({
                  aspectId: aspect.id,
                  competitorId: competitor.id,
                  expertId: carla.id,
                  value: values[2],
                  observation: getObservation(aspect.id, competitor.id, carla.id),
                  counters,
                });
              }
            }
          }
        }
      }
    }
  }

  console.log("Seed concluído com sucesso.");
  console.log("");
  console.log("Resumo:");
  console.log(`- Competição criada/reutilizada: ${competition.name}`);
  console.log(`- Avaliadores criados/reutilizados: ${counters.expertsCreated}/${counters.expertsReused}`);
  console.log(`- Competidores criados/reutilizados: ${counters.competitorsCreated}/${counters.competitorsReused}`);
  console.log(`- Marks criadas: ${counters.marksCreated}`);
  console.log(`- Marks ignoradas por já existirem: ${counters.marksSkipped}`);
}

async function findOrCreateCompetition() {
  const existingCompetition = await prisma.competition.findFirst({
    where: { name: competitionData.name },
  });

  if (existingCompetition) {
    return existingCompetition;
  }

  return prisma.competition.create({
    data: competitionData,
  });
}

async function seedExperts(competitionId: number, counters: SeedCounters) {
  const expertsByName = new Map<string, Awaited<ReturnType<typeof prisma.expert.create>>>();

  for (const expertSeed of expertSeeds) {
    const existingExpert = await prisma.expert.findFirst({
      where: {
        competitionId,
        name: expertSeed.name,
      },
    });

    if (existingExpert) {
      expertsByName.set(expertSeed.name, existingExpert);
      counters.expertsReused += 1;
      continue;
    }

    const expert = await prisma.expert.create({
      data: {
        competitionId,
        ...expertSeed,
      },
    });

    expertsByName.set(expertSeed.name, expert);
    counters.expertsCreated += 1;
  }

  return expertsByName;
}

async function seedCompetitors(competitionId: number, counters: SeedCounters) {
  const competitors = [];

  for (const competitorSeed of competitorSeeds) {
    const existingCompetitor = await prisma.competitor.findUnique({
      where: {
        competitionId_workstation: {
          competitionId,
          workstation: competitorSeed.workstation,
        },
      },
    });

    if (existingCompetitor) {
      competitors.push(existingCompetitor);
      counters.competitorsReused += 1;
      continue;
    }

    const competitor = await prisma.competitor.create({
      data: {
        competitionId,
        ...competitorSeed,
      },
    });

    competitors.push(competitor);
    counters.competitorsCreated += 1;
  }

  return competitors;
}

async function createMarkIfMissing(params: {
  aspectId: number;
  competitorId: number;
  expertId: number;
  value: number | Prisma.Decimal;
  observation: string | null;
  counters: SeedCounters;
}) {
  const existingMark = await prisma.mark.findUnique({
    where: {
      aspectId_competitorId_expertId: {
        aspectId: params.aspectId,
        competitorId: params.competitorId,
        expertId: params.expertId,
      },
    },
  });

  if (existingMark) {
    params.counters.marksSkipped += 1;
    return;
  }

  await prisma.mark.create({
    data: {
      aspectId: params.aspectId,
      competitorId: params.competitorId,
      expertId: params.expertId,
      value: new Prisma.Decimal(params.value),
      observation: params.observation,
      locked: false,
    },
  });

  params.counters.marksCreated += 1;
}

function getMeasurementValue(maxPoints: Prisma.Decimal, aspectId: number, competitorId: number) {
  const shouldFail = getSeedNumber(aspectId, competitorId, 1) % 5 === 0;

  return shouldFail ? new Prisma.Decimal(0) : maxPoints;
}

function getJudgementValues(aspectId: number, competitorId: number): [number, number, number] {
  const shouldCreateReview = getSeedNumber(aspectId, competitorId, 2) % 13 === 0;

  if (shouldCreateReview) {
    return [3, 1, 2];
  }

  const base = (getSeedNumber(aspectId, competitorId, 3) % 3) + 1;

  return [
    base,
    Math.max(1, Math.min(3, base + (aspectId % 2 === 0 ? 0 : 1))),
    Math.max(1, Math.min(3, base - (competitorId % 2 === 0 ? 0 : 1))),
  ];
}

function getObservation(aspectId: number, competitorId: number, expertId: number) {
  const seed = getSeedNumber(aspectId, competitorId, expertId);

  if (seed % 4 !== 0) {
    return null;
  }

  return observations[seed % observations.length] ?? null;
}

function getSeedNumber(...values: number[]) {
  return values.reduce((total, value, index) => total + value * (index + 3) * 17, 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

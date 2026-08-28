import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao foi configurada.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const competitors = await prisma.competitor.findMany({
    select: {
      id: true,
      competitionId: true,
    },
  });

  let existingLinks = 0;
  let createdLinks = 0;

  for (const competitor of competitors) {
    const link = await prisma.competitionCompetitor.findUnique({
      where: {
        competitionId_competitorId: {
          competitionId: competitor.competitionId,
          competitorId: competitor.id,
        },
      },
      select: { id: true },
    });

    if (link) {
      existingLinks += 1;
      continue;
    }

    await prisma.competitionCompetitor.create({
      data: {
        competitionId: competitor.competitionId,
        competitorId: competitor.id,
      },
    });
    createdLinks += 1;
  }

  console.log("Migracao de vinculos de competidores concluida.");
  console.log(`Competidores encontrados: ${competitors.length}`);
  console.log(`Vinculos criados: ${createdLinks}`);
  console.log(`Vinculos ja existentes: ${existingLinks}`);
}

main()
  .catch((error) => {
    console.error("Erro ao migrar vinculos de competidores.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

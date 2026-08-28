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
  const experts = await prisma.expert.findMany({
    select: {
      id: true,
      competitionId: true,
    },
  });

  let existingLinks = 0;
  let createdLinks = 0;

  for (const expert of experts) {
    const link = await prisma.competitionExpert.findUnique({
      where: {
        competitionId_expertId: {
          competitionId: expert.competitionId,
          expertId: expert.id,
        },
      },
      select: { id: true },
    });

    if (link) {
      existingLinks += 1;
      continue;
    }

    await prisma.competitionExpert.create({
      data: {
        competitionId: expert.competitionId,
        expertId: expert.id,
      },
    });
    createdLinks += 1;
  }

  console.log("Migracao de vinculos de usuarios concluida.");
  console.log(`Usuarios encontrados: ${experts.length}`);
  console.log(`Vinculos criados: ${createdLinks}`);
  console.log(`Vinculos ja existentes: ${existingLinks}`);
}

main()
  .catch((error) => {
    console.error("Erro ao migrar vinculos de usuarios.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { ExpertRole } from "../generated/prisma/enums.js";

const databaseUrl = process.env.DATABASE_URL;
const confirmed = process.argv.includes("--confirm");

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi configurada.");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });

async function main() {
  if (!confirmed) {
    console.log(
      "Operação cancelada. Este comando apaga todos os dados do MySQL; execute npm run prisma:reset-real-test -- --confirm para continuar.",
    );
    return;
  }

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.mark.deleteMany(),
    prisma.aspect.deleteMany(),
    prisma.subCriterion.deleteMany(),
    prisma.criterion.deleteMany(),
    prisma.module.deleteMany(),
    prisma.competitor.deleteMany(),
    prisma.expert.deleteMany(),
    prisma.competition.deleteMany(),
  ]);

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 3);

  const competition = await prisma.competition.create({
    data: {
      name: "Teste Local com Dados Reais",
      location: "Local",
      startDate: now,
      endDate,
    },
  });

  await prisma.expert.create({
    data: {
      competitionId: competition.id,
      name: "Administrador Local",
      state: "PR",
      role: ExpertRole.ADMIN,
    },
  });

  console.log("Reset do MySQL concluído com sucesso.");
  console.log("Crie um backup com sua ferramenta MySQL antes de executar este comando em dados importantes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { ExpertRole } from "../generated/prisma/enums.js";

const databaseUrl = process.env.DATABASE_URL;
const confirmed = process.argv.includes("--confirm");

if (!databaseUrl) {
  throw new Error("DATABASE_URL nao foi configurada.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  if (!confirmed) {
    console.log(
      "Operacao cancelada. Este comando apaga todos os dados do banco; execute npm run prisma:reset-real-test -- --confirm para continuar.",
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
      email: "admin@local.test",
      passwordHash: await bcrypt.hash("admin123", 10),
      state: "PR",
      role: ExpertRole.ADMIN,
      isActive: true,
    },
  });

  console.log("Reset do banco concluido com sucesso.");
  console.log("Usuario ADMIN criado: admin@local.test / admin123");
  console.log("Crie um backup antes de executar este comando em dados importantes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

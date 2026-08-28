import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { ExpertRole } from "../generated/prisma/enums.js";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} nao foi configurada.`);
  }

  return value;
}

const databaseUrl = getRequiredEnv("DATABASE_URL");
const adminName = getRequiredEnv("ADMIN_NAME");
const adminEmail = getRequiredEnv("ADMIN_EMAIL");
const adminPassword = getRequiredEnv("ADMIN_PASSWORD");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const existingAdmin = await prisma.expert.findUnique({
    where: { email: adminEmail },
    include: { competitionLinks: true },
  });

  if (existingAdmin) {
    console.log(`ADMIN ja existe: ${existingAdmin.email}`);
    return;
  }

  let competition = await prisma.competition.findFirst({
    orderBy: { id: "asc" },
  });

  if (!competition) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 1);

    competition = await prisma.competition.create({
      data: {
        name: "Ambiente de Producao",
        location: "Online",
        startDate: now,
        endDate,
      },
    });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.expert.create({
    data: {
      competitionId: competition.id,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: ExpertRole.ADMIN,
      isActive: true,
      competitionLinks: {
        create: {
          competitionId: competition.id,
        },
      },
    },
  });

  console.log(`ADMIN criado com sucesso: ${admin.email}`);
  console.log(`Competicao vinculada: ${competition.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

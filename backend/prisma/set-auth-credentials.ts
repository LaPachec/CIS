import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { ExpertRole } from "../generated/prisma/enums.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL nao foi configurada.");
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function main() {
  const experts = await prisma.expert.findMany({
    orderBy: { id: "asc" },
  });

  for (const expert of experts) {
    const defaultEmail =
      expert.name === "Administrador Local" ? "admin@local.test" : `${slugify(expert.name)}.${expert.id}@local.test`;
    const email = expert.email === "administrador.local.1@local.test" ? defaultEmail : expert.email || defaultEmail;
    const password = expert.role === ExpertRole.ADMIN ? "admin123" : "123456";

    await prisma.expert.update({
      where: { id: expert.id },
      data: {
        email,
        passwordHash: expert.passwordHash || (await bcrypt.hash(password, 10)),
        isActive: true,
      },
    });

    console.log(`${expert.id} | ${expert.name} | ${email} | ${password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

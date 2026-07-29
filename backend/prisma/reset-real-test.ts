import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../generated/prisma/client.js";
import { ExpertRole } from "../generated/prisma/enums.js";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const confirmed = process.argv.includes("--confirm");
let prisma: PrismaClient | null = null;

const currentFile = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(currentFile), "..");
const backupsDir = path.join(backendDir, "backups");

async function main() {
  if (!confirmed) {
    console.log(
      "Operação cancelada. Para limpar o banco local, execute: npm run prisma:reset-real-test -- --confirm",
    );
    return;
  }

  prisma = createPrismaClient();

  const databasePath = resolveSqlitePath(databaseUrl);
  const backupPath = await backupDatabase(databasePath);

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

  await resetSqliteSequence();
  await vacuumDatabase();

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

  console.log("");
  console.log("Reset local concluído com sucesso.");
  console.log("");
  console.log("Backup criado em:");
  console.log(backupPath ? path.relative(backendDir, backupPath) : "Nenhum banco existente encontrado para backup.");
  console.log("");
  console.log("Dados criados:");
  console.log("- Competição: Teste Local com Dados Reais");
  console.log("- Usuário ADMIN: Administrador Local");
  console.log("");
  console.log("Próximos passos:");
  console.log("1. Rodar backend: npm run dev");
  console.log("2. Rodar frontend");
  console.log("3. Entrar como Administrador Local");
  console.log("4. Importar ficha de avaliação");
  console.log("5. Cadastrar competidores reais");
  console.log("6. Cadastrar avaliadores reais");
  console.log("7. Iniciar lançamento de notas");
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
  });

  return new PrismaClient({ adapter });
}

function getPrisma() {
  if (!prisma) {
    throw new Error("PrismaClient não inicializado.");
  }

  return prisma;
}

function resolveSqlitePath(url: string) {
  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL deve usar SQLite no formato file:./dev.db");
  }

  const rawPath = url.replace(/^file:/, "");

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  return path.resolve(backendDir, rawPath);
}

async function backupDatabase(databasePath: string) {
  const exists = await fileExists(databasePath);

  if (!exists) {
    console.log("Nenhum banco existente encontrado para backup.");
    return null;
  }

  await mkdir(backupsDir, { recursive: true });

  const backupPath = path.join(
    backupsDir,
    `before-real-test-reset-${formatTimestamp(new Date())}.sqlite`,
  );

  await copyFile(databasePath, backupPath);

  return backupPath;
}

async function fileExists(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function formatTimestamp(date: Date) {
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((value) => String(value).padStart(2, "0"));

  return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}`;
}

async function resetSqliteSequence() {
  try {
    await getPrisma().$executeRawUnsafe("DELETE FROM sqlite_sequence");
  } catch {
    // sqlite_sequence exists only when AUTOINCREMENT tables were already created.
  }
}

async function vacuumDatabase() {
  try {
    await getPrisma().$executeRawUnsafe("VACUUM");
  } catch {
    console.warn("Aviso: não foi possível executar VACUUM no SQLite.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });

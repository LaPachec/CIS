import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao foi configurada. Copie .env.example para .env e informe a conexao SQLite.");
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

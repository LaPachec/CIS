import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sqliteHeader = "SQLite format 3";

export class DatabaseNotFoundError extends Error {
  constructor() {
    super("Database not found");
  }
}

export class InvalidBackupFileError extends Error {
  constructor() {
    super("Invalid backup file");
  }
}

export type DatabaseStatus = {
  databasePath: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string;
};

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "..", "..");

export function getTimestamp() {
  const now = new Date();
  const values = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ];

  return values
    .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, "0")))
    .join("-");
}

export function getBackupDownloadFilename() {
  return `cis-simulado-backup-${getTimestamp()}.sqlite`;
}

export function getSqliteDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new DatabaseNotFoundError();
  }

  const rawPath = databaseUrl.replace(/^file:/, "").replace(/^"|"$/g, "");
  const decodedPath = decodeURIComponent(rawPath);
  const resolvedPath = path.isAbsolute(decodedPath)
    ? decodedPath
    : path.resolve(backendRoot, decodedPath);

  return resolvedPath;
}

export async function assertDatabaseExists() {
  const databasePath = getSqliteDatabasePath();

  try {
    await access(databasePath, constants.R_OK | constants.W_OK);
  } catch {
    throw new DatabaseNotFoundError();
  }

  return databasePath;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const databasePath = await assertDatabaseExists();
  const databaseStat = await stat(databasePath);

  return {
    databasePath: path.relative(backendRoot, databasePath).replace(/\\/g, "/"),
    exists: true,
    sizeBytes: databaseStat.size,
    sizeFormatted: formatBytes(databaseStat.size),
    lastModified: databaseStat.mtime.toISOString(),
  };
}

export async function readDatabaseBackup() {
  const databasePath = await assertDatabaseExists();
  const buffer = await readFile(databasePath);

  return {
    buffer,
    filename: getBackupDownloadFilename(),
  };
}

export async function restoreDatabaseBackup(file: {
  buffer: Buffer;
  filename: string;
}) {
  validateBackupFile(file);

  const databasePath = await assertDatabaseExists();
  const backupDirectory = path.resolve(backendRoot, "backups");
  const backupBeforeRestore = path.join(
    backupDirectory,
    `before-restore-${getTimestamp()}.sqlite`,
  );

  await mkdir(backupDirectory, { recursive: true });
  await copyFile(databasePath, backupBeforeRestore);
  await writeFile(databasePath, file.buffer);

  return {
    backupBeforeRestore,
    backupBeforeRestoreRelative: path.relative(backendRoot, backupBeforeRestore).replace(/\\/g, "/"),
  };
}

function validateBackupFile(file: { buffer: Buffer; filename: string }) {
  const extension = path.extname(file.filename).toLowerCase();

  if (![".sqlite", ".db"].includes(extension)) {
    throw new InvalidBackupFileError();
  }

  if (file.buffer.length <= 0) {
    throw new InvalidBackupFileError();
  }

  const header = file.buffer.subarray(0, sqliteHeader.length).toString("utf8");

  if (header !== sqliteHeader) {
    throw new InvalidBackupFileError();
  }
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(2)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
}

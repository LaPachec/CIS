import "dotenv/config";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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

export class UnsupportedDatabaseBackupError extends Error {
  constructor() {
    super("File backup is supported only for SQLite databases");
  }
}

export type DatabaseStatus = {
  databasePath: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string;
};

export type BackupFile = {
  buffer: Buffer;
  filename: string;
};

export type RestoreResult = {
  backupBeforeRestore: string;
  backupBeforeRestoreRelative: string;
};

const backendRoot = process.cwd();
const backupsDirectory = path.join(backendRoot, "backups");

function getDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.startsWith("file:")) {
    throw new UnsupportedDatabaseBackupError();
  }

  const rawPath = databaseUrl.replace(/^file:/, "");

  return path.resolve(backendRoot, rawPath);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureValidSqliteBuffer(buffer: Buffer) {
  if (buffer.length < 16 || buffer.subarray(0, 16).toString("utf8") !== "SQLite format 3\0") {
    throw new InvalidBackupFileError();
  }
}

export async function assertDatabaseExists() {
  const databasePath = getDatabasePath();

  if (!existsSync(databasePath)) {
    throw new DatabaseNotFoundError();
  }

  return databasePath;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const databasePath = getDatabasePath();

  if (!existsSync(databasePath)) {
    return {
      databasePath,
      exists: false,
      sizeBytes: 0,
      sizeFormatted: "0 B",
      lastModified: "",
    };
  }

  const databaseStat = await stat(databasePath);

  return {
    databasePath,
    exists: true,
    sizeBytes: databaseStat.size,
    sizeFormatted: formatBytes(databaseStat.size),
    lastModified: databaseStat.mtime.toISOString(),
  };
}

export async function readDatabaseBackup(): Promise<BackupFile> {
  const databasePath = await assertDatabaseExists();
  const buffer = await readFile(databasePath);

  await ensureValidSqliteBuffer(buffer);

  return {
    buffer,
    filename: `cis-simulado-backup-${timestamp()}.db`,
  };
}

export async function restoreDatabaseBackup(file: BackupFile): Promise<RestoreResult> {
  const databasePath = getDatabasePath();

  await ensureValidSqliteBuffer(file.buffer);
  await mkdir(backupsDirectory, { recursive: true });

  const backupBeforeRestore = path.join(backupsDirectory, `before-restore-${timestamp()}.db`);

  if (existsSync(databasePath)) {
    await copyFile(databasePath, backupBeforeRestore);
  } else {
    await writeFile(backupBeforeRestore, Buffer.alloc(0));
  }

  await writeFile(databasePath, file.buffer);

  return {
    backupBeforeRestore,
    backupBeforeRestoreRelative: path.relative(backendRoot, backupBeforeRestore),
  };
}

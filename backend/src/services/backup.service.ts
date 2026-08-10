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

export class MySqlBackupNotSupportedError extends Error {
  constructor() {
    super("MySQL file backups are not supported");
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

function unsupported(): never {
  throw new MySqlBackupNotSupportedError();
}

export async function assertDatabaseExists() {
  unsupported();
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  unsupported();
}

export async function readDatabaseBackup(): Promise<BackupFile> {
  unsupported();
}

export async function restoreDatabaseBackup(_file: BackupFile): Promise<RestoreResult> {
  unsupported();
}

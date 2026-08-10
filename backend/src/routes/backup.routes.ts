import { AuditAction, ExpertRole } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import {
  assertDatabaseExists,
  DatabaseNotFoundError,
  getDatabaseStatus,
  InvalidBackupFileError,
  UnsupportedDatabaseBackupError,
  readDatabaseBackup,
  restoreDatabaseBackup,
} from "../services/backup.service.js";
import { getRequestUser, sendData, sendError, type RequestUser } from "./helpers.js";
import type { FastifyInstance, FastifyReply } from "fastify";

const permissionError = "VocÃª nÃ£o tem permissÃ£o para realizar esta aÃ§Ã£o.";

function canDownloadBackup(user: RequestUser) {
  return user.userRole === ExpertRole.ADMIN || user.userRole === ExpertRole.SUPERVISOR;
}

function canRestoreBackup(user: RequestUser) {
  return user.userRole === ExpertRole.ADMIN;
}

function sendBackupFile(
  reply: FastifyReply,
  file: Awaited<ReturnType<typeof readDatabaseBackup>>,
) {
  reply.header("Content-Type", "application/octet-stream");
  reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);

  return reply.send(file.buffer);
}

async function createBackupAuditLog(params: {
  userName: string;
  entity: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  try {
    const competition = await prisma.competition.findFirst({
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!competition) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        competitionId: competition.id,
        userName: params.userName,
        entity: params.entity,
        entityId: String(Date.now()),
        action: params.action,
        oldValue: params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
        newValue: params.newValue === undefined ? null : JSON.stringify(params.newValue),
      },
    });
  } catch {
    // TODO: tornar AuditLog independente de competitionId para registrar rotinas administrativas globais.
  }
}

function getUserName(user: RequestUser) {
  if (user.userId) {
    return `user-${user.userId}`;
  }

  return user.userRole ?? "system";
}

function handleBackupError(reply: FastifyReply, error: unknown) {
  if (error instanceof UnsupportedDatabaseBackupError) {
    return sendError(
      reply,
      501,
      "Backup de arquivo esta disponivel apenas para bancos SQLite configurados com DATABASE_URL=file:.",
    );
  }

  if (error instanceof DatabaseNotFoundError) {
    return sendError(reply, 404, "Banco de dados nÃ£o encontrado.");
  }

  if (error instanceof InvalidBackupFileError) {
    return sendError(reply, 400, "Arquivo de backup invÃ¡lido.");
  }

  return sendError(reply, 400, "Erro ao processar backup.");
}

export async function backupRoutes(app: FastifyInstance) {
  app.get("/backup/status", async (request, reply) => {
    const user = getRequestUser({ headers: request.headers });

    if (!canDownloadBackup(user)) {
      return sendError(reply, 403, permissionError);
    }

    try {
      return sendData(reply, await getDatabaseStatus());
    } catch (error) {
      return handleBackupError(reply, error);
    }
  });

  app.get("/backup/download", async (request, reply) => {
    const user = getRequestUser({ headers: request.headers });

    if (!canDownloadBackup(user)) {
      return sendError(reply, 403, permissionError);
    }

    try {
      const file = await readDatabaseBackup();

      await createBackupAuditLog({
        userName: getUserName(user),
        entity: "Backup",
        action: AuditAction.CREATE,
        newValue: { filename: file.filename },
      });

      return sendBackupFile(reply, file);
    } catch (error) {
      return handleBackupError(reply, error);
    }
  });

  app.post("/backup/restore", async (request, reply) => {
    const user = getRequestUser({ headers: request.headers });

    if (!canRestoreBackup(user)) {
      return sendError(reply, 403, permissionError);
    }

    try {
      await assertDatabaseExists();

      const uploadedFile = await request.file();

      if (!uploadedFile) {
        return sendError(reply, 400, "Arquivo de backup invÃ¡lido.");
      }

      const file = {
        buffer: await uploadedFile.toBuffer(),
        filename: uploadedFile.filename,
      };

      await prisma.$disconnect();

      const result = await restoreDatabaseBackup(file);

      await createBackupAuditLog({
        userName: getUserName(user),
        entity: "BackupRestore",
        action: AuditAction.UPDATE,
        oldValue: { backupBeforeRestore: result.backupBeforeRestoreRelative },
        newValue: { filename: file.filename },
      });

      return sendData(reply, {
        message:
          "Banco restaurado com sucesso. Reinicie o servidor para garantir que as conexÃµes sejam atualizadas.",
        backupBeforeRestore: result.backupBeforeRestoreRelative,
      });
    } catch (error) {
      return handleBackupError(reply, error);
    }
  });
}


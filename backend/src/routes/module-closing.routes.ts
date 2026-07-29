import type { FastifyInstance, FastifyReply } from "fastify";
import { ExpertRole } from "../../generated/prisma/enums.js";
import {
  getCollectiveModuleClosingDetails,
  getCollectiveModuleClosingStatus,
  lockModuleCollectively,
  ModuleClosingServiceError,
  unlockModuleCollectively,
} from "../services/module-closing.service.js";
import { getRequestRoleValue, parsePositiveInt, sendData, sendError } from "./helpers.js";

type ClosingQuery = {
  competitionId?: string;
};

type ClosingBody = {
  userName?: string;
  userRole?: string;
};

const permissionError = "Você não tem permissão para realizar esta ação.";

function canManageCollectiveClosing(role: string | undefined) {
  return role === ExpertRole.ADMIN || role === ExpertRole.SUPERVISOR;
}

function ensurePermission(
  request: {
    headers?: Record<string, string | string[] | undefined>;
    body?: { userRole?: string };
  },
  reply: FastifyReply,
) {
  const role = getRequestRoleValue(request);

  if (!canManageCollectiveClosing(role)) {
    return sendError(reply, 403, permissionError);
  }

  return null;
}

function parseCompetitionId(value: string | undefined) {
  return parsePositiveInt(value);
}

function handleServiceError(reply: FastifyReply, error: unknown) {
  if (error instanceof ModuleClosingServiceError) {
    if (error.statusCode === 409) {
      return reply.status(409).send({
        error: error.message,
        details: error.details ?? [],
      });
    }

    return sendError(reply, error.statusCode, error.message);
  }

  return sendError(reply, 500, "Internal server error");
}

export async function moduleClosingRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ClosingQuery }>("/closing/modules", async (request, reply) => {
    const permissionErrorResponse = ensurePermission({ headers: request.headers }, reply);

    if (permissionErrorResponse) {
      return permissionErrorResponse;
    }

    const competitionId = parseCompetitionId(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      return sendData(reply, await getCollectiveModuleClosingStatus(competitionId));
    } catch (error) {
      return handleServiceError(reply, error);
    }
  });

  app.get<{ Params: { moduleId: string }; Querystring: ClosingQuery }>(
    "/closing/modules/:moduleId/details",
    async (request, reply) => {
      const permissionErrorResponse = ensurePermission({ headers: request.headers }, reply);

      if (permissionErrorResponse) {
        return permissionErrorResponse;
      }

      const competitionId = parseCompetitionId(request.query.competitionId);
      const moduleId = parsePositiveInt(request.params.moduleId);

      if (!competitionId) {
        return sendError(reply, 400, "competitionId is required");
      }

      if (!moduleId) {
        return sendError(reply, 400, "Invalid module id");
      }

      try {
        return sendData(reply, await getCollectiveModuleClosingDetails(competitionId, moduleId));
      } catch (error) {
        return handleServiceError(reply, error);
      }
    },
  );

  app.patch<{ Params: { moduleId: string }; Querystring: ClosingQuery; Body: ClosingBody }>(
    "/closing/modules/:moduleId/lock-all",
    async (request, reply) => {
      const permissionErrorResponse = ensurePermission(request, reply);

      if (permissionErrorResponse) {
        return permissionErrorResponse;
      }

      const competitionId = parseCompetitionId(request.query.competitionId);
      const moduleId = parsePositiveInt(request.params.moduleId);

      if (!competitionId) {
        return sendError(reply, 400, "competitionId is required");
      }

      if (!moduleId) {
        return sendError(reply, 400, "Invalid module id");
      }

      try {
        return sendData(
          reply,
          await lockModuleCollectively({
            competitionId,
            moduleId,
            userName: request.body?.userName,
          }),
        );
      } catch (error) {
        return handleServiceError(reply, error);
      }
    },
  );

  app.patch<{ Params: { moduleId: string }; Querystring: ClosingQuery; Body: ClosingBody }>(
    "/closing/modules/:moduleId/unlock-all",
    async (request, reply) => {
      const permissionErrorResponse = ensurePermission(request, reply);

      if (permissionErrorResponse) {
        return permissionErrorResponse;
      }

      const competitionId = parseCompetitionId(request.query.competitionId);
      const moduleId = parsePositiveInt(request.params.moduleId);

      if (!competitionId) {
        return sendError(reply, 400, "competitionId is required");
      }

      if (!moduleId) {
        return sendError(reply, 400, "Invalid module id");
      }

      try {
        return sendData(
          reply,
          await unlockModuleCollectively({
            competitionId,
            moduleId,
            userName: request.body?.userName,
          }),
        );
      } catch (error) {
        return handleServiceError(reply, error);
      }
    },
  );
}

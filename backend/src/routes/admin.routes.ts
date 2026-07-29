import { ExpertRole } from "../../generated/prisma/enums.js";
import {
  InconsistenciesServiceError,
  listCompetitionInconsistencies,
} from "../services/inconsistencies.service.js";
import { getRequestRoleValue, parsePositiveInt, sendData, sendError } from "./helpers.js";
import type { FastifyInstance } from "fastify";

const permissionError = "Você não tem permissão para visualizar inconsistências administrativas.";

function canViewAdminInconsistencies(role: string | undefined) {
  return role === ExpertRole.ADMIN || role === ExpertRole.SUPERVISOR;
}

export async function adminRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/admin/inconsistencies", async (request, reply) => {
    const role = getRequestRoleValue({ headers: request.headers });

    if (!canViewAdminInconsistencies(role)) {
      return sendError(reply, 403, permissionError);
    }

    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      return sendData(reply, await listCompetitionInconsistencies(competitionId));
    } catch (error) {
      if (error instanceof InconsistenciesServiceError) {
        return sendError(reply, error.statusCode, error.message);
      }

      return sendError(reply, 500, "Internal server error");
    }
  });
}

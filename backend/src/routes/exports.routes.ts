import { ExpertRole } from "../../generated/prisma/enums.js";
import type { FastifyInstance } from "fastify";
import {
  excelContentType,
  generateCompetitionWorkbook,
  generateCompetitorWorkbook,
  generateRankingWorkbook,
} from "../services/export-excel.service.js";
import { parseExpertRole, parsePositiveInt, sendError } from "./helpers.js";

function canExport(userRole?: string) {
  return userRole === ExpertRole.ADMIN || userRole === ExpertRole.SUPERVISOR;
}

function getHeaderRole(request: { headers: Record<string, string | string[] | undefined> }) {
  const value = request.headers["x-user-role"];

  return parseExpertRole(Array.isArray(value) ? value[0] : value);
}

async function sendWorkbook(
  reply: Parameters<typeof sendError>[0],
  file: Awaited<ReturnType<typeof generateRankingWorkbook>>,
) {
  reply.header("Content-Type", excelContentType);
  reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);

  return reply.send(file.buffer);
}

export async function exportsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/exports/ranking", async (request, reply) => {
    const userRole = getHeaderRole(request);

    if (!canExport(userRole)) {
      return sendError(reply, 403, "Você não tem permissão para exportar resultados.");
    }

    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      return sendWorkbook(reply, await generateRankingWorkbook(competitionId));
    } catch (error) {
      return sendError(reply, error instanceof Error && error.message.includes("not found") ? 404 : 400, "Dados não encontrados para exportação.");
    }
  });

  app.get<{ Params: { competitorId: string }; Querystring: { competitionId?: string } }>(
    "/exports/competitors/:competitorId",
    async (request, reply) => {
      const userRole = getHeaderRole(request);

      if (!canExport(userRole)) {
        return sendError(reply, 403, "Você não tem permissão para exportar resultados.");
      }

      const competitionId = parsePositiveInt(request.query.competitionId);
      const competitorId = parsePositiveInt(request.params.competitorId);

      if (!competitionId) {
        return sendError(reply, 400, "competitionId is required");
      }

      if (!competitorId) {
        return sendError(reply, 400, "Invalid competitor id");
      }

      try {
        return sendWorkbook(reply, await generateCompetitorWorkbook(competitionId, competitorId));
      } catch (error) {
        return sendError(reply, error instanceof Error && error.message.includes("not found") ? 404 : 400, "Dados não encontrados para exportação.");
      }
    },
  );

  app.get<{ Querystring: { competitionId?: string } }>("/exports/competition", async (request, reply) => {
    const userRole = getHeaderRole(request);

    if (!canExport(userRole)) {
      return sendError(reply, 403, "Você não tem permissão para exportar resultados.");
    }

    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      return sendWorkbook(reply, await generateCompetitionWorkbook(competitionId));
    } catch (error) {
      return sendError(reply, error instanceof Error && error.message.includes("not found") ? 404 : 400, "Dados não encontrados para exportação.");
    }
  });
}

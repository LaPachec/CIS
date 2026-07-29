import type { FastifyInstance } from "fastify";
import {
  calculateCompetitionResult,
  calculateModuleResult,
  calculateRanking,
  ResultsServiceError,
} from "../services/results.service.js";
import { denyRoles, parsePositiveInt, sendData, sendError } from "./helpers.js";

type CompetitionResultQuery = {
  competitionId?: string;
};

function handleResultsError(reply: Parameters<typeof sendError>[0], error: unknown) {
  if (error instanceof ResultsServiceError) {
    return sendError(reply, error.statusCode, error.message);
  }

  return sendError(reply, 500, "Internal server error");
}

export async function resultsRoutes(app: FastifyInstance) {
  app.get<{
    Params: { competitorId: string; moduleId: string };
  }>("/results/competitors/:competitorId/modules/:moduleId", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT"]);

    if (denied) {
      return denied;
    }

    const competitorId = parsePositiveInt(request.params.competitorId);
    const moduleId = parsePositiveInt(request.params.moduleId);

    if (!competitorId) {
      return sendError(reply, 400, "Invalid competitor id");
    }

    if (!moduleId) {
      return sendError(reply, 400, "Invalid module id");
    }

    try {
      const result = await calculateModuleResult(competitorId, moduleId);

      return sendData(reply, result);
    } catch (error) {
      return handleResultsError(reply, error);
    }
  });

  app.get<{
    Params: { competitorId: string };
    Querystring: CompetitionResultQuery;
  }>("/results/competitors/:competitorId", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT"]);

    if (denied) {
      return denied;
    }

    const competitorId = parsePositiveInt(request.params.competitorId);
    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitorId) {
      return sendError(reply, 400, "Invalid competitor id");
    }

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      const result = await calculateCompetitionResult(competitionId, competitorId);

      return sendData(reply, result);
    } catch (error) {
      return handleResultsError(reply, error);
    }
  });

  app.get<{
    Querystring: CompetitionResultQuery;
  }>("/results/ranking", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT"]);

    if (denied) {
      return denied;
    }

    const competitionId = parsePositiveInt(request.query.competitionId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    try {
      const ranking = await calculateRanking(competitionId);

      return sendData(reply, ranking);
    } catch (error) {
      return handleResultsError(reply, error);
    }
  });
}

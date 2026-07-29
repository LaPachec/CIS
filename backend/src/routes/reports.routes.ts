import type { FastifyInstance } from "fastify";
import {
  calculateWsosPerformance,
  WsosPerformanceServiceError,
} from "../services/wsos-performance.service.js";
import { denyRoles, parsePositiveInt, sendData, sendError } from "./helpers.js";

type WsosPerformanceQuery = {
  competitionId?: string;
  competitorId?: string;
};

export async function reportsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: WsosPerformanceQuery }>("/reports/wsos-performance", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT"]);

    if (denied) {
      return denied;
    }

    const competitionId = parsePositiveInt(request.query.competitionId);
    const competitorId = parsePositiveInt(request.query.competitorId);

    if (!competitionId) {
      return sendError(reply, 400, "competitionId é obrigatório.");
    }

    if (!competitorId) {
      return sendError(reply, 400, "competitorId é obrigatório.");
    }

    try {
      const result = await calculateWsosPerformance(competitionId, competitorId);

      return sendData(reply, result);
    } catch (error) {
      if (error instanceof WsosPerformanceServiceError) {
        return sendError(reply, error.statusCode, error.message);
      }

      return sendError(reply, 500, "Internal server error");
    }
  });
}

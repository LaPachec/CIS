import { ExpertRole } from "../../generated/prisma/enums.js";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  generateClosingPdf,
  pdfContentType,
} from "../services/export-pdf.service.js";
import { getRequestUser, parsePositiveInt, sendError } from "./helpers.js";

function canGenerateClosingPdf(userRole?: string) {
  return userRole === ExpertRole.ADMIN || userRole === ExpertRole.SUPERVISOR;
}

function sendPdf(
  reply: FastifyReply,
  file: Awaited<ReturnType<typeof generateClosingPdf>>,
) {
  reply.header("Content-Type", pdfContentType);
  reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);

  return reply.send(file.buffer);
}

export async function pdfRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>(
    "/exports/pdf/closing",
    async (request, reply) => {
      const user = getRequestUser({ headers: request.headers });

      if (!canGenerateClosingPdf(user.userRole)) {
        return sendError(
          reply,
          403,
          "Você não tem permissão para gerar o PDF oficial de fechamento.",
        );
      }

      const competitionId = parsePositiveInt(request.query.competitionId);

      if (!competitionId) {
        return sendError(reply, 400, "competitionId is required");
      }

      try {
        return sendPdf(reply, await generateClosingPdf(competitionId));
      } catch (error) {
        const statusCode =
          error instanceof Error && error.message.includes("not found") ? 404 : 400;

        return sendError(reply, statusCode, "Dados da competição não encontrados.");
      }
    },
  );
}

import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { denyRoles, parsePositiveInt, sendData, sendError } from "./helpers.js";

type SubCriterionBody = {
  criterionId?: number | string;
  code?: string;
  name?: string;
  description?: string | null;
  markingDay?: string | null;
  markingTeam?: string | null;
  userRole?: string;
};

type SubCriteriaQuery = {
  criterionId?: string;
};

function validateSubCriterionBody(body: SubCriterionBody) {
  const criterionId = parsePositiveInt(body.criterionId);

  if (!criterionId) {
    throw new Error("criterionId must be a positive integer");
  }

  if (!body.code) {
    throw new Error("code is required");
  }

  if (!body.name) {
    throw new Error("name is required");
  }

  return {
    criterionId,
    code: body.code,
    name: body.name,
    description: body.description ?? null,
    markingDay: body.markingDay ?? null,
    markingTeam: body.markingTeam ?? null,
  };
}

export async function subCriteriaRoutes(app: FastifyInstance) {
  app.get<{ Querystring: SubCriteriaQuery }>("/subcriteria", async (request, reply) => {
    const criterionId = request.query.criterionId ? parsePositiveInt(request.query.criterionId) : null;

    if (request.query.criterionId && !criterionId) {
      return sendError(reply, 400, "criterionId must be a positive integer");
    }

    const where: { criterionId?: number } = {};

    if (criterionId) {
      where.criterionId = criterionId;
    }

    const subCriteria = await prisma.subCriterion.findMany({
      where,
      orderBy: { code: "asc" },
    });

    return sendData(reply, subCriteria);
  });

  app.post<{ Body: SubCriterionBody }>("/subcriteria", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    try {
      const data = validateSubCriterionBody(request.body);
      const subCriterion = await prisma.subCriterion.create({ data });

      return sendData(reply, subCriterion, 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.get<{ Params: { id: string } }>("/subcriteria/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid subcriterion id");
    }

    const subCriterion = await prisma.subCriterion.findUnique({
      where: { id },
      include: {
        aspects: {
          orderBy: { code: "asc" },
        },
      },
    });

    if (!subCriterion) {
      return sendError(reply, 404, "SubCriterion not found");
    }

    return sendData(reply, subCriterion);
  });

  app.put<{ Params: { id: string }; Body: SubCriterionBody }>("/subcriteria/:id", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid subcriterion id");
    }

    const subCriterionExists = await prisma.subCriterion.findUnique({ where: { id } });

    if (!subCriterionExists) {
      return sendError(reply, 404, "SubCriterion not found");
    }

    try {
      const data = validateSubCriterionBody(request.body);
      const subCriterion = await prisma.subCriterion.update({
        where: { id },
        data,
      });

      return sendData(reply, subCriterion);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.delete<{ Params: { id: string } }>("/subcriteria/:id", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid subcriterion id");
    }

    const subCriterionExists = await prisma.subCriterion.findUnique({ where: { id } });

    if (!subCriterionExists) {
      return sendError(reply, 404, "SubCriterion not found");
    }

    await prisma.subCriterion.delete({ where: { id } });

    return reply.status(204).send();
  });
}

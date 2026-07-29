import type { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { denyRoles, parsePositiveInt, sendData, sendError } from "./helpers.js";

type CriterionBody = {
  moduleId?: number | string;
  code?: string;
  name?: string;
  description?: string | null;
  totalPoints?: number | string;
  userRole?: string;
};

type CriteriaQuery = {
  moduleId?: string;
};

function validateCriterionBody(body: CriterionBody) {
  const moduleId = parsePositiveInt(body.moduleId);
  const totalPoints = Number(body.totalPoints);

  if (!moduleId) {
    throw new Error("moduleId must be a positive integer");
  }

  if (!body.code) {
    throw new Error("code is required");
  }

  if (!body.name) {
    throw new Error("name is required");
  }

  if (!Number.isFinite(totalPoints) || totalPoints < 0) {
    throw new Error("totalPoints must be a numeric value");
  }

  return {
    moduleId,
    code: body.code,
    name: body.name,
    description: body.description ?? null,
    totalPoints: new Prisma.Decimal(totalPoints),
  };
}

export async function criteriaRoutes(app: FastifyInstance) {
  app.get<{ Querystring: CriteriaQuery }>("/criteria", async (request, reply) => {
    const moduleId = request.query.moduleId ? parsePositiveInt(request.query.moduleId) : null;

    if (request.query.moduleId && !moduleId) {
      return sendError(reply, 400, "moduleId must be a positive integer");
    }

    const where: { moduleId?: number } = {};

    if (moduleId) {
      where.moduleId = moduleId;
    }

    const criteria = await prisma.criterion.findMany({
      where,
      orderBy: { code: "asc" },
    });

    return sendData(reply, criteria);
  });

  app.post<{ Body: CriterionBody }>("/criteria", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    try {
      const data = validateCriterionBody(request.body);
      const criterion = await prisma.criterion.create({ data });

      return sendData(reply, criterion, 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.get<{ Params: { id: string } }>("/criteria/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid criterion id");
    }

    const criterion = await prisma.criterion.findUnique({
      where: { id },
      include: {
        subCriteria: {
          orderBy: { code: "asc" },
        },
      },
    });

    if (!criterion) {
      return sendError(reply, 404, "Criterion not found");
    }

    return sendData(reply, criterion);
  });

  app.put<{ Params: { id: string }; Body: CriterionBody }>("/criteria/:id", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid criterion id");
    }

    const criterionExists = await prisma.criterion.findUnique({ where: { id } });

    if (!criterionExists) {
      return sendError(reply, 404, "Criterion not found");
    }

    try {
      const data = validateCriterionBody(request.body);
      const criterion = await prisma.criterion.update({
        where: { id },
        data,
      });

      return sendData(reply, criterion);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.delete<{ Params: { id: string } }>("/criteria/:id", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid criterion id");
    }

    const criterionExists = await prisma.criterion.findUnique({ where: { id } });

    if (!criterionExists) {
      return sendError(reply, 404, "Criterion not found");
    }

    await prisma.criterion.delete({ where: { id } });

    return reply.status(204).send();
  });
}

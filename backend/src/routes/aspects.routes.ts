import type { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";
import { AspectType, type AspectType as AspectTypeValue } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { parsePositiveInt, sendData, sendError } from "./helpers.js";

type AspectBody = {
  subCriterionId?: number | string;
  code?: string;
  description?: string;
  type?: string;
  wsos?: string | null;
  maxPoints?: number | string;
  calculationRule?: string | null;
  descriptor0?: string | null;
  descriptor1?: string | null;
  descriptor2?: string | null;
  descriptor3?: string | null;
};

type AspectsQuery = {
  subCriterionId?: string;
};

function validateAspectBody(body: AspectBody) {
  const subCriterionId = parsePositiveInt(body.subCriterionId);
  const maxPoints = Number(body.maxPoints);

  if (!subCriterionId) {
    throw new Error("subCriterionId must be a positive integer");
  }

  if (!body.code) {
    throw new Error("code is required");
  }

  if (!body.description) {
    throw new Error("description is required");
  }

  if (!body.type || !Object.values(AspectType).includes(body.type as AspectTypeValue)) {
    throw new Error("type must be MEASUREMENT or JUDGEMENT");
  }

  if (!Number.isFinite(maxPoints) || maxPoints < 0) {
    throw new Error("maxPoints must be a numeric value");
  }

  return {
    subCriterionId,
    code: body.code,
    description: body.description,
    type: body.type as AspectTypeValue,
    wsos: body.wsos ?? null,
    maxPoints: new Prisma.Decimal(maxPoints),
    calculationRule: body.calculationRule ?? null,
    descriptor0: body.descriptor0 ?? null,
    descriptor1: body.descriptor1 ?? null,
    descriptor2: body.descriptor2 ?? null,
    descriptor3: body.descriptor3 ?? null,
  };
}

export async function aspectsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AspectsQuery }>("/aspects", async (request, reply) => {
    const subCriterionId = request.query.subCriterionId ? parsePositiveInt(request.query.subCriterionId) : null;

    if (request.query.subCriterionId && !subCriterionId) {
      return sendError(reply, 400, "subCriterionId must be a positive integer");
    }

    const where: { subCriterionId?: number } = {};

    if (subCriterionId) {
      where.subCriterionId = subCriterionId;
    }

    const aspects = await prisma.aspect.findMany({
      where,
      orderBy: { code: "asc" },
    });

    return sendData(reply, aspects);
  });

  app.post<{ Body: AspectBody }>("/aspects", async (request, reply) => {
    try {
      const data = validateAspectBody(request.body);
      const aspect = await prisma.aspect.create({ data });

      return sendData(reply, aspect, 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.get<{ Params: { id: string } }>("/aspects/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid aspect id");
    }

    const aspect = await prisma.aspect.findUnique({ where: { id } });

    if (!aspect) {
      return sendError(reply, 404, "Aspect not found");
    }

    return sendData(reply, aspect);
  });

  app.put<{ Params: { id: string }; Body: AspectBody }>("/aspects/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid aspect id");
    }

    const aspectExists = await prisma.aspect.findUnique({ where: { id } });

    if (!aspectExists) {
      return sendError(reply, 404, "Aspect not found");
    }

    try {
      const data = validateAspectBody(request.body);
      const aspect = await prisma.aspect.update({
        where: { id },
        data,
      });

      return sendData(reply, aspect);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.delete<{ Params: { id: string } }>("/aspects/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid aspect id");
    }

    const aspectExists = await prisma.aspect.findUnique({ where: { id } });

    if (!aspectExists) {
      return sendError(reply, 404, "Aspect not found");
    }

    await prisma.aspect.delete({ where: { id } });

    return reply.status(204).send();
  });
}

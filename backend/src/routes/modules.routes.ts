import type { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { parsePositiveInt, sendData, sendError } from "./helpers.js";

type ModuleBody = {
  competitionId?: number;
  code?: string;
  name?: string;
  description?: string | null;
  totalPoints?: number | string;
};

function parseId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function validateModuleBody(body: ModuleBody) {
  const competitionId = Number(body.competitionId);
  const totalPoints = Number(body.totalPoints);

  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new Error("competitionId must be a positive integer");
  }

  if (!body.code) {
    throw new Error("code is required");
  }

  if (!body.name) {
    throw new Error("name is required");
  }

  if (!Number.isFinite(totalPoints) || totalPoints < 0) {
    throw new Error("totalPoints must be a positive number");
  }

  return {
    competitionId,
    code: body.code,
    name: body.name,
    description: body.description ?? null,
    totalPoints: new Prisma.Decimal(totalPoints),
  };
}

export async function modulesRoutes(app: FastifyInstance) {
  app.get("/modules", async () => {
    return prisma.module.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  app.post<{ Body: ModuleBody }>("/modules", async (request, reply) => {
    try {
      const data = validateModuleBody(request.body);

      const module = await prisma.module.create({
        data,
      });

      return reply.status(201).send(module);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get<{ Params: { id: string } }>("/modules/:id/assessment-structure", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid module id");
    }

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        criteria: {
          orderBy: { code: "asc" },
          include: {
            subCriteria: {
              orderBy: { code: "asc" },
              include: {
                aspects: {
                  orderBy: { code: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!module) {
      return sendError(reply, 404, "Module not found");
    }

    return sendData(reply, module);
  });

  app.get<{ Params: { id: string } }>("/modules/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid module id" });
    }

    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      return reply.status(404).send({ message: "Module not found" });
    }

    return module;
  });

  app.put<{ Params: { id: string }; Body: ModuleBody }>("/modules/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid module id" });
    }

    const moduleExists = await prisma.module.findUnique({
      where: { id },
    });

    if (!moduleExists) {
      return reply.status(404).send({ message: "Module not found" });
    }

    try {
      const data = validateModuleBody(request.body);

      const module = await prisma.module.update({
        where: { id },
        data,
      });

      return module;
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete<{ Params: { id: string } }>("/modules/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid module id" });
    }

    const moduleExists = await prisma.module.findUnique({
      where: { id },
    });

    if (!moduleExists) {
      return reply.status(404).send({ message: "Module not found" });
    }

    await prisma.module.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}

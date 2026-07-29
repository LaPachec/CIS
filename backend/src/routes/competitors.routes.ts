import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { denyRoles, parsePositiveInt, sendData, sendError } from "./helpers.js";

type CompetitorBody = {
  competitionId?: number;
  name?: string;
  state?: string | null;
  workstation?: string | null;
  userRole?: string;
};

function parseId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function validateCompetitorBody(body: CompetitorBody) {
  const competitionId = Number(body.competitionId);

  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new Error("competitionId must be a positive integer");
  }

  if (!body.name) {
    throw new Error("name is required");
  }

  return {
    competitionId,
    name: body.name,
    state: body.state ?? null,
    workstation: body.workstation ?? null,
  };
}

export async function competitorsRoutes(app: FastifyInstance) {
  app.get("/competitors", async () => {
    return prisma.competitor.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  app.post<{ Body: CompetitorBody }>("/competitors", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    try {
      const data = validateCompetitorBody(request.body);

      const competitor = await prisma.competitor.create({
        data,
      });

      return reply.status(201).send(competitor);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get<{ Params: { id: string; moduleId: string } }>(
    "/competitors/:id/module/:moduleId/marks",
    async (request, reply) => {
      const id = parsePositiveInt(request.params.id);
      const moduleId = parsePositiveInt(request.params.moduleId);

      if (!id) {
        return sendError(reply, 400, "Invalid competitor id");
      }

      if (!moduleId) {
        return sendError(reply, 400, "Invalid module id");
      }

      const [competitor, module] = await Promise.all([
        prisma.competitor.findUnique({ where: { id } }),
        prisma.module.findUnique({
          where: { id: moduleId },
          include: {
            criteria: {
              orderBy: { code: "asc" },
              include: {
                subCriteria: {
                  orderBy: { code: "asc" },
                  include: {
                    aspects: {
                      orderBy: { code: "asc" },
                      include: {
                        marks: {
                          where: { competitorId: id },
                          include: {
                            expert: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      if (!competitor) {
        return sendError(reply, 404, "Competitor not found");
      }

      if (!module) {
        return sendError(reply, 404, "Module not found");
      }

      if (competitor.competitionId !== module.competitionId) {
        return sendError(reply, 400, "Competitor and module must belong to the same competition");
      }

      return sendData(reply, {
        competitor,
        module,
      });
    },
  );

  app.get<{ Params: { id: string } }>("/competitors/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competitor id" });
    }

    const competitor = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      return reply.status(404).send({ message: "Competitor not found" });
    }

    return competitor;
  });

  app.put<{ Params: { id: string }; Body: CompetitorBody }>("/competitors/:id", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competitor id" });
    }

    const competitorExists = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitorExists) {
      return reply.status(404).send({ message: "Competitor not found" });
    }

    try {
      const data = validateCompetitorBody(request.body);

      const competitor = await prisma.competitor.update({
        where: { id },
        data,
      });

      return competitor;
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete<{ Params: { id: string } }>("/competitors/:id", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competitor id" });
    }

    const competitorExists = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitorExists) {
      return reply.status(404).send({ message: "Competitor not found" });
    }

    await prisma.competitor.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}

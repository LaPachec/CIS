import type { FastifyInstance, FastifyReply } from "fastify";
import { AuditAction, ExpertRole } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { getRequestRoleValue, parsePositiveInt, sendData, sendError } from "./helpers.js";

type CompetitorBody = {
  competitionId?: number;
  name?: string;
  state?: string | null;
  workstation?: string | null;
  userRole?: string;
  userName?: string;
};

function parseId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function ensureAdmin(
  request: {
    headers?: Record<string, string | string[] | undefined>;
    body?: { userRole?: string };
  },
  reply: FastifyReply,
) {
  const role = getRequestRoleValue(request);

  if (role !== ExpertRole.ADMIN) {
    return sendError(reply, 403, "Você não tem permissão para realizar esta ação.");
  }

  return null;
}

async function validateCompetitorBody(body: CompetitorBody, currentCompetitorId?: number) {
  const competitionId = Number(body.competitionId);

  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new Error("Competição é obrigatória.");
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });

  if (!competition) {
    throw new Error("Competição não encontrada.");
  }

  if (!body.name?.trim()) {
    throw new Error("Nome do competidor é obrigatório.");
  }

  const workstation = body.workstation?.trim() || null;

  if (workstation) {
    const existingWorkstation = await prisma.competitor.findFirst({
      where: {
        competitionId,
        workstation,
        ...(currentCompetitorId ? { id: { not: currentCompetitorId } } : {}),
      },
      select: { id: true },
    });

    if (existingWorkstation) {
      throw new Error("Já existe um competidor com este posto nesta competição.");
    }
  }

  return {
    competitionId,
    name: body.name.trim(),
    state: body.state?.trim() || null,
    workstation,
  };
}

async function createAuditLog(params: {
  competitionId: number;
  userName?: string | undefined;
  entityId: number;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      competitionId: params.competitionId,
      userName: params.userName || "system",
      entity: "Competitor",
      entityId: String(params.entityId),
      action: params.action,
      oldValue: params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      newValue: params.newValue === undefined ? null : JSON.stringify(params.newValue),
    },
  });
}

const competitionSelect = {
  id: true,
  name: true,
  location: true,
} as const;

export async function competitorsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/competitors", async (request, reply) => {
    const competitionId = request.query.competitionId
      ? parsePositiveInt(request.query.competitionId)
      : null;

    if (request.query.competitionId && !competitionId) {
      return sendError(reply, 400, "Invalid competition id");
    }

    return prisma.competitor.findMany({
      ...(competitionId ? { where: { competitionId } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        competition: {
          select: competitionSelect,
        },
      },
    });
  });

  app.post<{ Body: CompetitorBody }>("/competitors", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    try {
      const data = await validateCompetitorBody(request.body);
      const competitor = await prisma.competitor.create({
        data,
        include: {
          competition: {
            select: competitionSelect,
          },
        },
      });

      await createAuditLog({
        competitionId: competitor.competitionId,
        userName: request.body?.userName,
        entityId: competitor.id,
        action: AuditAction.CREATE,
        oldValue: null,
        newValue: competitor,
      });

      return sendData(reply, competitor, 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Não foi possível concluir a operação.");
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
      return sendError(reply, 400, "Invalid competitor id");
    }

    const competitor = await prisma.competitor.findUnique({
      where: { id },
      include: {
        competition: {
          select: competitionSelect,
        },
      },
    });

    if (!competitor) {
      return sendError(reply, 404, "Competitor not found");
    }

    return sendData(reply, competitor);
  });

  app.put<{ Params: { id: string }; Body: CompetitorBody }>("/competitors/:id", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid competitor id");
    }

    const competitorExists = await prisma.competitor.findUnique({
      where: { id },
      include: {
        competition: {
          select: competitionSelect,
        },
      },
    });

    if (!competitorExists) {
      return sendError(reply, 404, "Competitor not found");
    }

    try {
      const data = await validateCompetitorBody(request.body, id);
      const competitor = await prisma.competitor.update({
        where: { id },
        data,
        include: {
          competition: {
            select: competitionSelect,
          },
        },
      });

      await createAuditLog({
        competitionId: competitor.competitionId,
        userName: request.body?.userName,
        entityId: competitor.id,
        action: AuditAction.UPDATE,
        oldValue: competitorExists,
        newValue: competitor,
      });

      return sendData(reply, competitor);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    }
  });

  app.delete<{ Params: { id: string } }>("/competitors/:id", async (request, reply) => {
    const denied = ensureAdmin({ headers: request.headers }, reply);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid competitor id");
    }

    const competitorExists = await prisma.competitor.findUnique({
      where: { id },
      include: {
        competition: {
          select: competitionSelect,
        },
      },
    });

    if (!competitorExists) {
      return sendError(reply, 404, "Competitor not found");
    }

    await prisma.competitor.delete({
      where: { id },
    });

    await createAuditLog({
      competitionId: competitorExists.competitionId,
      userName: getHeaderValue(request.headers["x-user-name"]),
      entityId: competitorExists.id,
      action: AuditAction.DELETE,
      oldValue: competitorExists,
      newValue: null,
    });

    return reply.status(204).send();
  });
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

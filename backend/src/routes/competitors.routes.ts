import type { FastifyInstance, FastifyReply } from "fastify";
import { AuditAction, ExpertRole } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { syncCompetitorCompetitions } from "../services/competition-memberships.service.js";
import { getRequestRoleValue, parsePositiveInt, sendData, sendError } from "./helpers.js";

type CompetitorBody = {
  competitionId?: number | string;
  competitionIds?: Array<number | string>;
  name?: string;
  state?: string | null;
  workstation?: string | null;
  userRole?: string;
  userName?: string;
};

const competitionSelect = {
  id: true,
  name: true,
  location: true,
} as const;

const competitorInclude = {
  competition: {
    select: competitionSelect,
  },
  competitionLinks: {
    include: {
      competition: {
        select: competitionSelect,
      },
    },
    orderBy: {
      competition: {
        name: "asc",
      },
    },
  },
} as const;

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
    return sendError(reply, 403, "Voce nao tem permissao para realizar esta acao.");
  }

  return null;
}

function normalizeCompetitionIds(body: CompetitorBody) {
  const selectedIds = Array.isArray(body.competitionIds)
    ? body.competitionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const primaryCompetitionId = Number(body.competitionId ?? selectedIds[0]);

  if (!Number.isInteger(primaryCompetitionId) || primaryCompetitionId <= 0) {
    throw new Error("Competicao e obrigatoria.");
  }

  return [...new Set([primaryCompetitionId, ...selectedIds])];
}

async function validateCompetitorBody(body: CompetitorBody, currentCompetitorId?: number) {
  const competitionIds = normalizeCompetitionIds(body);
  const competitionId = competitionIds[0]!;

  const competitions = await prisma.competition.findMany({
    where: { id: { in: competitionIds } },
    select: { id: true },
  });

  if (competitions.length !== competitionIds.length) {
    throw new Error("Uma ou mais competicoes nao foram encontradas.");
  }

  if (!body.name?.trim()) {
    throw new Error("Nome do competidor e obrigatorio.");
  }

  const workstation = body.workstation?.trim() || null;

  if (workstation) {
    const existingWorkstation = await prisma.competitor.findFirst({
      where: {
        workstation,
        OR: [
          { competitionId: { in: competitionIds } },
          { competitionLinks: { some: { competitionId: { in: competitionIds } } } },
        ],
        ...(currentCompetitorId ? { id: { not: currentCompetitorId } } : {}),
      },
      select: { id: true },
    });

    if (existingWorkstation) {
      throw new Error("Ja existe um competidor com este posto em uma das competicoes selecionadas.");
    }
  }

  return {
    competitionId,
    competitionIds,
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

function mapCompetitor(competitor: {
  competitionLinks?: Array<{ competition: { id: number; name: string; location: string | null } }>;
  [key: string]: unknown;
}) {
  const competitions = competitor.competitionLinks?.map((link) => link.competition) ?? [];
  const { competitionLinks, ...data } = competitor;

  return {
    ...data,
    competitions,
  };
}

export async function competitorsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/competitors", async (request, reply) => {
    const competitionId = request.query.competitionId ? parsePositiveInt(request.query.competitionId) : null;

    if (request.query.competitionId && !competitionId) {
      return sendError(reply, 400, "Invalid competition id");
    }

    const competitors = await prisma.competitor.findMany({
      ...(competitionId ? { where: { competitionLinks: { some: { competitionId } } } } : {}),
      orderBy: { createdAt: "desc" },
      include: competitorInclude,
    });

    return sendData(reply, competitors.map(mapCompetitor));
  });

  app.post<{ Body: CompetitorBody }>("/competitors", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    try {
      const data = await validateCompetitorBody(request.body);
      const competitor = await prisma.competitor.create({
        data: {
          competitionId: data.competitionId,
          name: data.name,
          state: data.state,
          workstation: data.workstation,
        },
        include: competitorInclude,
      });

      await syncCompetitorCompetitions(competitor.id, data.competitionIds);

      const savedCompetitor = await prisma.competitor.findUnique({
        where: { id: competitor.id },
        include: competitorInclude,
      });

      await createAuditLog({
        competitionId: competitor.competitionId,
        userName: request.body?.userName,
        entityId: competitor.id,
        action: AuditAction.CREATE,
        oldValue: null,
        newValue: savedCompetitor,
      });

      return sendData(reply, mapCompetitor(savedCompetitor ?? competitor), 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.");
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
        prisma.competitor.findUnique({ where: { id }, include: competitorInclude }),
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

      const belongsToCompetition = competitor.competitionLinks.some(
        (link) => link.competition.id === module.competitionId,
      );

      if (!belongsToCompetition && competitor.competitionId !== module.competitionId) {
        return sendError(reply, 403, "Usuario ou competidor nao esta vinculado a competicao selecionada.");
      }

      return sendData(reply, {
        competitor: mapCompetitor(competitor),
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
      include: competitorInclude,
    });

    if (!competitor) {
      return sendError(reply, 404, "Competitor not found");
    }

    return sendData(reply, mapCompetitor(competitor));
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
      include: competitorInclude,
    });

    if (!competitorExists) {
      return sendError(reply, 404, "Competitor not found");
    }

    try {
      const data = await validateCompetitorBody(request.body, id);
      const competitor = await prisma.competitor.update({
        where: { id },
        data: {
          competitionId: data.competitionId,
          name: data.name,
          state: data.state,
          workstation: data.workstation,
        },
        include: competitorInclude,
      });

      await syncCompetitorCompetitions(competitor.id, data.competitionIds);

      const savedCompetitor = await prisma.competitor.findUnique({
        where: { id: competitor.id },
        include: competitorInclude,
      });

      await createAuditLog({
        competitionId: competitor.competitionId,
        userName: request.body?.userName,
        entityId: competitor.id,
        action: AuditAction.UPDATE,
        oldValue: competitorExists,
        newValue: savedCompetitor,
      });

      return sendData(reply, mapCompetitor(savedCompetitor ?? competitor));
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.");
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
      include: competitorInclude,
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

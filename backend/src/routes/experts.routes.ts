import type { FastifyInstance, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { Prisma } from "../../generated/prisma/client.js";
import { AuditAction, ExpertRole, type ExpertRole as ExpertRoleType } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { syncExpertCompetitions } from "../services/competition-memberships.service.js";
import { getRequestRoleValue, parsePositiveInt, sendData, sendError } from "./helpers.js";

type ExpertBody = {
  competitionId?: number | string;
  competitionIds?: Array<number | string>;
  name?: string;
  email?: string | null;
  password?: string;
  state?: string | null;
  role?: string;
  isActive?: boolean;
  userRole?: string;
  userName?: string;
};

const competitionSelect = {
  id: true,
  name: true,
  location: true,
} as const;

const publicExpertSelect = {
  id: true,
  competitionId: true,
  name: true,
  email: true,
  state: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
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
} satisfies Prisma.ExpertSelect;

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

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizeCompetitionIds(body: ExpertBody) {
  const selectedIds = Array.isArray(body.competitionIds)
    ? body.competitionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const primaryCompetitionId = Number(body.competitionId ?? selectedIds[0]);

  if (!Number.isInteger(primaryCompetitionId) || primaryCompetitionId <= 0) {
    throw new Error("Competicao e obrigatoria.");
  }

  return [...new Set([primaryCompetitionId, ...selectedIds])];
}

async function validateExpertBody(body: ExpertBody, options: { isCreate: boolean }) {
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
    throw new Error("Nome do usuario e obrigatorio.");
  }

  const email = normalizeEmail(body.email);

  if (options.isCreate && !email) {
    throw new Error("Email do usuario e obrigatorio.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email invalido.");
  }

  if (options.isCreate && (!body.password || body.password.length < 6)) {
    throw new Error("Senha e obrigatoria e deve ter pelo menos 6 caracteres.");
  }

  if (body.password && body.password.length < 6) {
    throw new Error("Senha deve ter pelo menos 6 caracteres.");
  }

  const role = body.role ?? ExpertRole.EXPERT;

  if (!Object.values(ExpertRole).includes(role as ExpertRoleType)) {
    throw new Error("Perfil deve ser EXPERT, SUPERVISOR ou ADMIN.");
  }

  return {
    competitionId,
    competitionIds,
    name: body.name.trim(),
    email,
    state: body.state?.trim() || null,
    role: role as ExpertRoleType,
    isActive: body.isActive ?? true,
  };
}

async function countActiveAdminsExcept(expertId?: number) {
  return prisma.expert.count({
    where: {
      role: ExpertRole.ADMIN,
      isActive: true,
      ...(expertId ? { id: { not: expertId } } : {}),
    },
  });
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
      entity: "Expert",
      entityId: String(params.entityId),
      action: params.action,
      oldValue: params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      newValue: params.newValue === undefined ? null : JSON.stringify(params.newValue),
    },
  });
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function mapExpert(expert: {
  competitionLinks?: Array<{ competition: { id: number; name: string; location: string | null } }>;
  [key: string]: unknown;
}) {
  const competitions = expert.competitionLinks?.map((link) => link.competition) ?? [];
  const { competitionLinks, ...data } = expert;

  return {
    ...data,
    competitions,
  };
}

function getExpertCompetitionIds(expert: {
  competitionId: number;
  competitionLinks?: Array<{ competition: { id: number } }>;
}) {
  const linkedIds = expert.competitionLinks?.map((link) => link.competition.id) ?? [];

  return linkedIds.length > 0 ? linkedIds : [expert.competitionId];
}

export async function expertsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { competitionId?: string } }>("/experts", async (request, reply) => {
    const competitionId = request.query.competitionId ? parsePositiveInt(request.query.competitionId) : null;

    if (request.query.competitionId && !competitionId) {
      return sendError(reply, 400, "Invalid competition id");
    }

    const experts = await prisma.expert.findMany({
      ...(competitionId ? { where: { competitionLinks: { some: { competitionId } } } } : {}),
      orderBy: { createdAt: "desc" },
      select: publicExpertSelect,
    });

    return sendData(reply, experts.map(mapExpert));
  });

  app.post<{ Body: ExpertBody }>("/experts", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    try {
      const data = await validateExpertBody(request.body, { isCreate: true });
      const expert = await prisma.expert.create({
        data: {
          competitionId: data.competitionId,
          name: data.name,
          email: data.email,
          state: data.state,
          role: data.role,
          isActive: data.isActive,
          passwordHash: await bcrypt.hash(request.body.password!, 10),
        },
        select: publicExpertSelect,
      });

      await syncExpertCompetitions(expert.id, data.competitionIds);

      const savedExpert = await prisma.expert.findUnique({
        where: { id: expert.id },
        select: publicExpertSelect,
      });

      await createAuditLog({
        competitionId: expert.competitionId,
        userName: request.user?.name ?? request.body?.userName,
        entityId: expert.id,
        action: AuditAction.CREATE,
        oldValue: null,
        newValue: savedExpert
          ? {
              ...savedExpert,
              competitionIds: getExpertCompetitionIds(savedExpert),
            }
          : null,
      });

      return sendData(reply, mapExpert(savedExpert ?? expert), 201);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return sendError(reply, 409, "Ja existe um usuario com este email.");
      }

      return sendError(reply, 400, error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.");
    }
  });

  app.get<{ Params: { id: string } }>("/experts/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid expert id");
    }

    const expert = await prisma.expert.findUnique({
      where: { id },
      select: publicExpertSelect,
    });

    if (!expert) {
      return sendError(reply, 404, "Expert not found");
    }

    return sendData(reply, mapExpert(expert));
  });

  app.put<{ Params: { id: string }; Body: ExpertBody }>("/experts/:id", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid expert id");
    }

    const expertExists = await prisma.expert.findUnique({
      where: { id },
      select: {
        ...publicExpertSelect,
        passwordHash: true,
      },
    });

    if (!expertExists) {
      return sendError(reply, 404, "Expert not found");
    }

    try {
      const data = await validateExpertBody(request.body, { isCreate: false });
      const willStopBeingActiveAdmin =
        expertExists.role === ExpertRole.ADMIN && (data.role !== ExpertRole.ADMIN || !data.isActive);

      if (willStopBeingActiveAdmin) {
        const otherAdmins = await countActiveAdminsExcept(id);

        if (otherAdmins === 0) {
          return sendError(reply, 409, "Nao e possivel alterar ou desativar o unico Administrador ativo do sistema.");
        }
      }

      const expert = await prisma.expert.update({
        where: { id },
        data: {
          competitionId: data.competitionId,
          name: data.name,
          email: data.email,
          state: data.state,
          role: data.role,
          isActive: data.isActive,
          ...(request.body.password ? { passwordHash: await bcrypt.hash(request.body.password, 10) } : {}),
        },
        select: publicExpertSelect,
      });

      await syncExpertCompetitions(expert.id, data.competitionIds);

      const savedExpert = await prisma.expert.findUnique({
        where: { id: expert.id },
        select: publicExpertSelect,
      });

      await createAuditLog({
        competitionId: expert.competitionId,
        userName: request.user?.name ?? request.body?.userName,
        entityId: expert.id,
        action: AuditAction.UPDATE,
        oldValue: {
          ...expertExists,
          competitionIds: getExpertCompetitionIds(expertExists),
        },
        newValue: savedExpert
          ? {
              ...savedExpert,
              competitionIds: getExpertCompetitionIds(savedExpert),
            }
          : null,
      });

      return sendData(reply, mapExpert(savedExpert ?? expert));
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return sendError(reply, 409, "Ja existe um usuario com este email.");
      }

      return sendError(reply, 400, error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.");
    }
  });

  app.delete<{ Params: { id: string } }>("/experts/:id", async (request, reply) => {
    const denied = ensureAdmin({ headers: request.headers }, reply);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid expert id");
    }

    const expertExists = await prisma.expert.findUnique({
      where: { id },
      select: publicExpertSelect,
    });

    if (!expertExists) {
      return sendError(reply, 404, "Expert not found");
    }

    if (expertExists.role === ExpertRole.ADMIN && expertExists.isActive) {
      const otherAdmins = await countActiveAdminsExcept(id);

      if (otherAdmins === 0) {
        return sendError(reply, 409, "Nao e possivel excluir o unico Administrador ativo do sistema.");
      }
    }

    const marksCount = await prisma.mark.count({
      where: { expertId: id },
    });

    if (marksCount > 0) {
      return sendError(reply, 409, "Nao e possivel excluir este usuario porque ele possui notas lancadas.");
    }

    await prisma.expert.delete({
      where: { id },
    });

    await createAuditLog({
      competitionId: expertExists.competitionId,
      userName: request.user?.name ?? getHeaderValue(request.headers["x-user-name"]),
      entityId: expertExists.id,
      action: AuditAction.DELETE,
      oldValue: expertExists,
      newValue: null,
    });

    return reply.status(204).send();
  });
}

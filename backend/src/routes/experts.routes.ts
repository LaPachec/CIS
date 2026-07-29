import type { FastifyInstance, FastifyReply } from "fastify";
import { AuditAction, ExpertRole, type ExpertRole as ExpertRoleType } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { getRequestRoleValue, sendData, sendError } from "./helpers.js";

type ExpertBody = {
  competitionId?: number;
  name?: string;
  state?: string | null;
  role?: string;
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

async function validateExpertBody(body: ExpertBody) {
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
    throw new Error("Nome do usuário é obrigatório.");
  }

  const role = body.role ?? ExpertRole.EXPERT;

  if (!Object.values(ExpertRole).includes(role as ExpertRoleType)) {
    throw new Error("Perfil deve ser EXPERT, SUPERVISOR ou ADMIN.");
  }

  return {
    competitionId,
    name: body.name.trim(),
    state: body.state?.trim() || null,
    role: role as ExpertRoleType,
  };
}

async function countAdminsExcept(expertId?: number) {
  return prisma.expert.count({
    where: {
      role: ExpertRole.ADMIN,
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

export async function expertsRoutes(app: FastifyInstance) {
  app.get("/experts", async () => {
    return prisma.expert.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });
  });

  app.post<{ Body: ExpertBody }>("/experts", async (request, reply) => {
    const denied = ensureAdmin(request, reply);

    if (denied) {
      return denied;
    }

    try {
      const data = await validateExpertBody(request.body);
      const expert = await prisma.expert.create({
        data,
        include: {
          competition: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      });

      await createAuditLog({
        competitionId: expert.competitionId,
        userName: request.body?.userName,
        entityId: expert.id,
        action: AuditAction.CREATE,
        oldValue: null,
        newValue: expert,
      });

      return sendData(reply, expert, 201);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    }
  });

  app.get<{ Params: { id: string } }>("/experts/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid expert id");
    }

    const expert = await prisma.expert.findUnique({
      where: { id },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!expert) {
      return sendError(reply, 404, "Expert not found");
    }

    return sendData(reply, expert);
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
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!expertExists) {
      return sendError(reply, 404, "Expert not found");
    }

    try {
      const data = await validateExpertBody(request.body);

      if (expertExists.role === ExpertRole.ADMIN && data.role !== ExpertRole.ADMIN) {
        const otherAdmins = await countAdminsExcept(id);

        if (otherAdmins === 0) {
          return sendError(reply, 409, "Não é possível alterar o único Administrador do sistema.");
        }
      }

      const expert = await prisma.expert.update({
        where: { id },
        data,
        include: {
          competition: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      });

      await createAuditLog({
        competitionId: expert.competitionId,
        userName: request.body?.userName,
        entityId: expert.id,
        action: AuditAction.UPDATE,
        oldValue: expertExists,
        newValue: expert,
      });

      return sendData(reply, expert);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Não foi possível concluir a operação.");
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
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!expertExists) {
      return sendError(reply, 404, "Expert not found");
    }

    if (expertExists.role === ExpertRole.ADMIN) {
      const otherAdmins = await countAdminsExcept(id);

      if (otherAdmins === 0) {
        return sendError(reply, 409, "Não é possível excluir o único Administrador do sistema.");
      }
    }

    const marksCount = await prisma.mark.count({
      where: { expertId: id },
    });

    if (marksCount > 0) {
      return sendError(reply, 409, "Não é possível excluir este usuário porque ele possui notas lançadas.");
    }

    await prisma.expert.delete({
      where: { id },
    });

    await createAuditLog({
      competitionId: expertExists.competitionId,
      userName: getHeaderValue(request.headers["x-user-name"]),
      entityId: expertExists.id,
      action: AuditAction.DELETE,
      oldValue: expertExists,
      newValue: null,
    });

    return reply.status(204).send();
  });
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

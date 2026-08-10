import type { FastifyReply, FastifyRequest } from "fastify";
import { ExpertRole, type ExpertRole as ExpertRoleValue } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../routes/helpers.js";

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string | null;
  role: ExpertRoleValue;
  competitionId: number;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      name: string;
      email: string | null;
      role: ExpertRoleValue;
      competitionId: number;
    };
    user: AuthenticatedUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{
      sub: string;
      name: string;
      email: string | null;
      role: ExpertRoleValue;
      competitionId: number;
    }>();
    const userId = Number(decoded.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return sendError(reply, 401, "Token invalido.");
    }

    const expert = await prisma.expert.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        competitionId: true,
        isActive: true,
      },
    });

    if (!expert || !expert.isActive) {
      return sendError(reply, 401, "Usuario inativo ou nao encontrado.");
    }

    request.user = {
      id: expert.id,
      name: expert.name,
      email: expert.email,
      role: expert.role,
      competitionId: expert.competitionId,
    };

    request.headers["x-user-id"] = String(expert.id);
    request.headers["x-user-role"] = expert.role;
    request.headers["x-user-name"] = expert.name;

    return undefined;
  } catch {
    return sendError(reply, 401, "Autenticacao obrigatoria.");
  }
}

export function requireRoles(...roles: ExpertRoleValue[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (reply.sent) {
      return;
    }

    if (!request.user || !roles.includes(request.user.role)) {
      return sendError(reply, 403, "Voce nao tem permissao para realizar esta acao.");
    }
  };
}

export function canAccessAuthenticatedRoute(method: string, pathname: string, role: ExpertRoleValue) {
  if (pathname.startsWith("/auth/")) {
    return true;
  }

  if (pathname.startsWith("/marks")) {
    return [ExpertRole.ADMIN, ExpertRole.SUPERVISOR, ExpertRole.EXPERT].includes(role);
  }

  if (pathname.startsWith("/checks/final")) {
    return ([ExpertRole.ADMIN, ExpertRole.SUPERVISOR] as ExpertRoleValue[]).includes(role);
  }

  if (pathname.startsWith("/checks")) {
    return [ExpertRole.ADMIN, ExpertRole.SUPERVISOR, ExpertRole.EXPERT].includes(role);
  }

  if (pathname.startsWith("/locks")) {
    return [ExpertRole.ADMIN, ExpertRole.SUPERVISOR, ExpertRole.EXPERT].includes(role);
  }

  if (
    pathname.startsWith("/results") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/exports") ||
    pathname.startsWith("/pdf") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/module-closing") ||
    pathname.startsWith("/backup")
  ) {
    return ([ExpertRole.ADMIN, ExpertRole.SUPERVISOR] as ExpertRoleValue[]).includes(role);
  }

  if (pathname.startsWith("/import")) {
    return role === ExpertRole.ADMIN;
  }

  if (
    pathname.startsWith("/competitions") ||
    pathname.startsWith("/competitors") ||
    pathname.startsWith("/experts") ||
    pathname.startsWith("/modules") ||
    pathname.startsWith("/criteria") ||
    pathname.startsWith("/subcriteria") ||
    pathname.startsWith("/aspects")
  ) {
    if (method === "GET") {
      return [ExpertRole.ADMIN, ExpertRole.SUPERVISOR, ExpertRole.EXPERT].includes(role);
    }

    return role === ExpertRole.ADMIN;
  }

  return [ExpertRole.ADMIN, ExpertRole.SUPERVISOR, ExpertRole.EXPERT].includes(role);
}

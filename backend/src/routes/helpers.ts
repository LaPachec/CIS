import type { FastifyReply } from "fastify";
import { ExpertRole, type ExpertRole as ExpertRoleValue } from "../../generated/prisma/enums.js";

export function parsePositiveInt(value: string | number | undefined) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function sendError(reply: FastifyReply, statusCode: number, error: string) {
  return reply.status(statusCode).send({ error });
}

export function sendData(reply: FastifyReply, data: unknown, statusCode = 200) {
  return reply.status(statusCode).send({ data });
}

export const permissionDeniedMessage = "Você não tem permissão para realizar esta ação.";

export type RequestUser = {
  userId?: number | undefined;
  userRole?: ExpertRoleValue | undefined;
};

export function getRequestUser(request: {
  headers?: Record<string, string | string[] | undefined>;
  body?: { userId?: number | string; userRole?: string };
}) {
  const headerUserId = request.headers?.["x-user-id"];
  const headerUserRole = request.headers?.["x-user-role"];
  const body = request.body;
  const userIdValue = body?.userId ?? (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId);
  const userRoleValue = body?.userRole ?? (Array.isArray(headerUserRole) ? headerUserRole[0] : headerUserRole);
  const userId = userIdValue === undefined || userIdValue === "" ? undefined : parsePositiveInt(userIdValue);
  const userRole = parseExpertRole(userRoleValue);

  return {
    userId: userId ?? undefined,
    userRole,
  };
}

export function getRequestRoleValue(request: {
  headers?: Record<string, string | string[] | undefined>;
  body?: { userRole?: string };
}) {
  const headerUserRole = request.headers?.["x-user-role"];
  const headerValue = Array.isArray(headerUserRole) ? headerUserRole[0] : headerUserRole;

  return request.body?.userRole ?? headerValue;
}

export function denyRoles(
  request: {
    headers?: Record<string, string | string[] | undefined>;
    body?: { userRole?: string };
  },
  reply: FastifyReply,
  roles: string[],
) {
  const role = getRequestRoleValue(request);

  if (role && roles.includes(role)) {
    return sendError(reply, 403, permissionDeniedMessage);
  }

  return null;
}

export function parseExpertRole(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === ExpertRole.EXPERT || value === ExpertRole.SUPERVISOR || value === ExpertRole.ADMIN) {
    return value;
  }

  return undefined;
}

export function hasAnyRole(user: RequestUser, roles: ExpertRoleValue[]) {
  if (!user.userRole) {
    return true;
  }

  return roles.includes(user.userRole);
}

export function isExpert(user: RequestUser) {
  return user.userRole === ExpertRole.EXPERT;
}

import type { FastifyInstance } from "fastify";
import { AuditAction, ExpertRole, type AuditAction as AuditActionValue } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { getRequestUser, hasAnyRole, isExpert, parsePositiveInt, sendData, sendError } from "./helpers.js";

type LockBody = {
  expertId?: number | string;
  userId?: number | string;
  userRole?: string;
  userName?: string;
};

type MarkWithCompetition = NonNullable<Awaited<ReturnType<typeof loadMark>>>;

async function createAuditLog(params: {
  competitionId: number;
  userName?: string | undefined;
  entity: string;
  entityId: number;
  action: AuditActionValue;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      competitionId: params.competitionId,
      userName: params.userName || "system",
      entity: params.entity,
      entityId: String(params.entityId),
      action: params.action,
      oldValue: params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      newValue: params.newValue === undefined ? null : JSON.stringify(params.newValue),
    },
  });
}

async function loadMark(markId: number) {
  return prisma.mark.findUnique({
    where: { id: markId },
    include: {
      competitor: true,
    },
  });
}

async function setMarkLock(mark: MarkWithCompetition, locked: boolean, userName?: string) {
  const updatedMark = await prisma.mark.update({
    where: { id: mark.id },
    data: { locked },
  });

  await createAuditLog({
    competitionId: mark.competitor.competitionId,
    userName,
    entity: "Mark",
    entityId: mark.id,
    action: locked ? AuditAction.LOCK : AuditAction.UNLOCK,
    oldValue: mark,
    newValue: updatedMark,
  });

  return updatedMark;
}

async function getSubCriterionAspectIds(subCriterionId: number) {
  const subCriterion = await prisma.subCriterion.findUnique({
    where: { id: subCriterionId },
    include: {
      criterion: {
        include: {
          module: true,
        },
      },
      aspects: {
        select: { id: true },
      },
    },
  });

  if (!subCriterion) {
    return null;
  }

  return {
    competitionId: subCriterion.criterion.module.competitionId,
    aspectIds: subCriterion.aspects.map((aspect) => aspect.id),
  };
}

async function getModuleAspectIds(moduleId: number) {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      criteria: {
        include: {
          subCriteria: {
            include: {
              aspects: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!module) {
    return null;
  }

  return {
    competitionId: module.competitionId,
    aspectIds: module.criteria.flatMap((criterion) =>
      criterion.subCriteria.flatMap((subCriterion) => subCriterion.aspects.map((aspect) => aspect.id)),
    ),
  };
}

async function setMarksLock(params: {
  competitorId: number;
  aspectIds: number[];
  entity: string;
  entityId: number;
  competitionId: number;
  locked: boolean;
  expertId?: number | undefined;
  userName?: string | undefined;
}) {
  const where = {
    competitorId: params.competitorId,
    aspectId: {
      in: params.aspectIds.length > 0 ? params.aspectIds : [0],
    },
    ...(params.expertId ? { expertId: params.expertId } : {}),
  };
  const previousMarks = await prisma.mark.findMany({
    where,
    orderBy: { id: "asc" },
  });

  if (previousMarks.length === 0) {
    await createAuditLog({
      competitionId: params.competitionId,
      userName: params.userName,
      entity: params.entity,
      entityId: params.entityId,
      action: params.locked ? AuditAction.LOCK : AuditAction.UNLOCK,
      oldValue: [],
      newValue: [],
    });

    return 0;
  }

  await prisma.mark.updateMany({
    where,
    data: {
      locked: params.locked,
    },
  });

  const updatedMarks = await prisma.mark.findMany({
    where: {
      id: {
        in: previousMarks.map((mark) => mark.id),
      },
    },
    orderBy: { id: "asc" },
  });

  await createAuditLog({
    competitionId: params.competitionId,
    userName: params.userName,
    entity: params.entity,
    entityId: params.entityId,
    action: params.locked ? AuditAction.LOCK : AuditAction.UNLOCK,
    oldValue: previousMarks,
    newValue: updatedMarks,
  });

  return updatedMarks.length;
}

function parseOptionalExpertId(body: LockBody) {
  if (body.expertId === undefined || body.expertId === null || body.expertId === "") {
    return undefined;
  }

  const expertId = parsePositiveInt(body.expertId);

  if (!expertId) {
    throw new Error("expertId must be a positive integer");
  }

  return expertId;
}

export async function locksRoutes(app: FastifyInstance) {
  app.patch<{ Params: { markId: string }; Body: LockBody }>("/locks/marks/:markId/lock", async (request, reply) => {
    const markId = parsePositiveInt(request.params.markId);

    if (!markId) {
      return sendError(reply, 400, "Invalid mark id");
    }

    const mark = await loadMark(markId);

    if (!mark) {
      return sendError(reply, 404, "Mark not found");
    }

    const user = getRequestUser(request);

    if (isExpert(user) && (!user.userId || user.userId !== mark.expertId)) {
      return sendError(reply, 403, "Ação não permitida para este perfil.");
    }

    const updatedMark = await setMarkLock(mark, true, request.body?.userName);

    return sendData(reply, updatedMark);
  });

  app.patch<{ Params: { markId: string }; Body: LockBody }>("/locks/marks/:markId/unlock", async (request, reply) => {
    const markId = parsePositiveInt(request.params.markId);

    if (!markId) {
      return sendError(reply, 400, "Invalid mark id");
    }

    const mark = await loadMark(markId);

    if (!mark) {
      return sendError(reply, 404, "Mark not found");
    }

    const user = getRequestUser(request);

    if (!hasAnyRole(user, [ExpertRole.SUPERVISOR, ExpertRole.ADMIN])) {
      return sendError(reply, 403, "Ação não permitida para este perfil.");
    }

    const updatedMark = await setMarkLock(mark, false, request.body?.userName);

    return sendData(reply, updatedMark);
  });

  app.patch<{ Params: { competitorId: string; subCriterionId: string }; Body: LockBody }>(
    "/locks/competitors/:competitorId/subcriteria/:subCriterionId/lock",
    async (request, reply) => {
      return setSubCriterionLock(request, reply, true);
    },
  );

  app.patch<{ Params: { competitorId: string; subCriterionId: string }; Body: LockBody }>(
    "/locks/competitors/:competitorId/subcriteria/:subCriterionId/unlock",
    async (request, reply) => {
      return setSubCriterionLock(request, reply, false);
    },
  );

  app.patch<{ Params: { competitorId: string; moduleId: string }; Body: LockBody }>(
    "/locks/competitors/:competitorId/modules/:moduleId/lock",
    async (request, reply) => {
      return setModuleLock(request, reply, true);
    },
  );

  app.patch<{ Params: { competitorId: string; moduleId: string }; Body: LockBody }>(
    "/locks/competitors/:competitorId/modules/:moduleId/unlock",
    async (request, reply) => {
      return setModuleLock(request, reply, false);
    },
  );
}

async function setSubCriterionLock(
  request: {
    params: { competitorId: string; subCriterionId: string };
    body: LockBody;
  },
  reply: Parameters<typeof sendError>[0],
  locked: boolean,
) {
  const competitorId = parsePositiveInt(request.params.competitorId);
  const subCriterionId = parsePositiveInt(request.params.subCriterionId);

  if (!competitorId) {
    return sendError(reply, 400, "Invalid competitor id");
  }

  if (!subCriterionId) {
    return sendError(reply, 400, "Invalid subCriterion id");
  }

  try {
    const user = getRequestUser(request);
    const expertId = parseOptionalExpertId(request.body ?? {});

    if (locked && isExpert(user) && (!user.userId || expertId !== user.userId)) {
      return sendError(reply, 403, "Ação não permitida para este perfil.");
    }

    if (!locked && !hasAnyRole(user, [ExpertRole.SUPERVISOR, ExpertRole.ADMIN])) {
      return sendError(reply, 403, "Ação não permitida para este perfil.");
    }

    const [competitor, subCriterionData] = await Promise.all([
      prisma.competitor.findUnique({ where: { id: competitorId } }),
      getSubCriterionAspectIds(subCriterionId),
    ]);

    if (!competitor) {
      return sendError(reply, 404, "Competitor not found");
    }

    if (!subCriterionData) {
      return sendError(reply, 404, "SubCriterion not found");
    }

    if (competitor.competitionId !== subCriterionData.competitionId) {
      return sendError(reply, 400, "Competitor and subCriterion must belong to the same competition");
    }

    const updatedMarks = await setMarksLock({
      competitorId,
      aspectIds: subCriterionData.aspectIds,
      entity: "SubCriterion",
      entityId: subCriterionId,
      competitionId: competitor.competitionId,
      locked,
      expertId,
      userName: request.body?.userName,
    });

    return sendData(reply, {
      lockedMarks: locked ? updatedMarks : 0,
      unlockedMarks: locked ? 0 : updatedMarks,
      updatedMarks,
    });
  } catch (error) {
    return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
  }
}

async function setModuleLock(
  request: {
    params: { competitorId: string; moduleId: string };
    body: LockBody;
  },
  reply: Parameters<typeof sendError>[0],
  locked: boolean,
) {
  const competitorId = parsePositiveInt(request.params.competitorId);
  const moduleId = parsePositiveInt(request.params.moduleId);

  if (!competitorId) {
    return sendError(reply, 400, "Invalid competitor id");
  }

  if (!moduleId) {
    return sendError(reply, 400, "Invalid module id");
  }

  try {
    const user = getRequestUser(request);

    if (!hasAnyRole(user, [ExpertRole.SUPERVISOR, ExpertRole.ADMIN])) {
      return sendError(reply, 403, "Ação não permitida para este perfil.");
    }

    const [competitor, moduleData] = await Promise.all([
      prisma.competitor.findUnique({ where: { id: competitorId } }),
      getModuleAspectIds(moduleId),
    ]);

    if (!competitor) {
      return sendError(reply, 404, "Competitor not found");
    }

    if (!moduleData) {
      return sendError(reply, 404, "Module not found");
    }

    if (competitor.competitionId !== moduleData.competitionId) {
      return sendError(reply, 400, "Competitor and module must belong to the same competition");
    }

    const updatedMarks = await setMarksLock({
      competitorId,
      aspectIds: moduleData.aspectIds,
      entity: "Module",
      entityId: moduleId,
      competitionId: competitor.competitionId,
      locked,
      expertId: parseOptionalExpertId(request.body ?? {}),
      userName: request.body?.userName,
    });

    return sendData(reply, {
      lockedMarks: locked ? updatedMarks : 0,
      unlockedMarks: locked ? 0 : updatedMarks,
      updatedMarks,
    });
  } catch (error) {
    return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
  }
}

import type { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";
import { AspectType, AuditAction, type AuditAction as AuditActionValue } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { parsePositiveInt, sendData, sendError } from "./helpers.js";

type MarksQuery = {
  competitorId?: string;
  aspectId?: string;
};

type MarkCreateBody = {
  aspectId?: number | string;
  competitorId?: number | string;
  expertId?: number | string;
  value?: number | string;
  observation?: string | null;
};

type MarkUpdateBody = {
  value?: number | string;
  observation?: string | null;
  locked?: boolean;
};

type LoadedMarkContext = Awaited<ReturnType<typeof loadMarkContext>>;

async function loadMarkContext(aspectId: number, competitorId: number, expertId: number) {
  const [aspect, competitor, expert] = await Promise.all([
    prisma.aspect.findUnique({
      where: { id: aspectId },
      include: {
        subCriterion: {
          include: {
            criterion: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    }),
    prisma.competitor.findUnique({ where: { id: competitorId } }),
    prisma.expert.findUnique({ where: { id: expertId } }),
  ]);

  if (!aspect) {
    throw new Error("Aspect not found");
  }

  if (!competitor) {
    throw new Error("Competitor not found");
  }

  if (!expert) {
    throw new Error("Expert not found");
  }

  const aspectCompetitionId = aspect.subCriterion.criterion.module.competitionId;

  if (aspectCompetitionId !== competitor.competitionId) {
    throw new Error("Aspect and competitor must belong to the same competition");
  }

  if (expert.competitionId !== competitor.competitionId) {
    throw new Error("Expert and competitor must belong to the same competition");
  }

  return {
    aspect,
    competitor,
    expert,
    competitionId: competitor.competitionId,
  };
}

function parseCreateBody(body: MarkCreateBody) {
  const aspectId = parsePositiveInt(body.aspectId);
  const competitorId = parsePositiveInt(body.competitorId);
  const expertId = parsePositiveInt(body.expertId);

  if (!aspectId) {
    throw new Error("aspectId must be a positive integer");
  }

  if (!competitorId) {
    throw new Error("competitorId must be a positive integer");
  }

  if (!expertId) {
    throw new Error("expertId must be a positive integer");
  }

  if (body.value === undefined || body.value === null || body.value === "") {
    throw new Error("value is required");
  }

  return {
    aspectId,
    competitorId,
    expertId,
    value: body.value,
    observation: body.observation ?? null,
  };
}

function validateValue(value: number | string, context: LoadedMarkContext) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("value must be a numeric value");
  }

  if (context.aspect.type === AspectType.MEASUREMENT) {
    const maxPoints = Number(context.aspect.maxPoints);

    if (numericValue < 0 || numericValue > maxPoints) {
      throw new Error(`value must be between 0 and ${maxPoints}`);
    }
  }

  if (context.aspect.type === AspectType.JUDGEMENT) {
    if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 3) {
      throw new Error("judgement value must be 0, 1, 2 or 3");
    }
  }

  return new Prisma.Decimal(numericValue);
}

async function createAuditLog(params: {
  competitionId: number;
  action: AuditActionValue;
  entityId: number;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      competitionId: params.competitionId,
      userName: "system",
      entity: "Mark",
      entityId: String(params.entityId),
      action: params.action,
      oldValue: params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      newValue: params.newValue === undefined ? null : JSON.stringify(params.newValue),
    },
  });
}

export async function marksRoutes(app: FastifyInstance) {
  app.get<{ Querystring: MarksQuery }>("/marks", async (request, reply) => {
    const competitorId = request.query.competitorId ? parsePositiveInt(request.query.competitorId) : null;
    const aspectId = request.query.aspectId ? parsePositiveInt(request.query.aspectId) : null;

    if (request.query.competitorId && !competitorId) {
      return sendError(reply, 400, "competitorId must be a positive integer");
    }

    if (request.query.aspectId && !aspectId) {
      return sendError(reply, 400, "aspectId must be a positive integer");
    }

    const where: { competitorId?: number; aspectId?: number } = {};

    if (competitorId) {
      where.competitorId = competitorId;
    }

    if (aspectId) {
      where.aspectId = aspectId;
    }

    const marks = await prisma.mark.findMany({
      where,
      include: {
        aspect: true,
        competitor: true,
        expert: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sendData(reply, marks);
  });

  app.post<{ Body: MarkCreateBody }>("/marks", async (request, reply) => {
    try {
      const body = parseCreateBody(request.body);
      const context = await loadMarkContext(body.aspectId, body.competitorId, body.expertId);

      const duplicatedMark = await prisma.mark.findUnique({
        where: {
          aspectId_competitorId_expertId: {
            aspectId: body.aspectId,
            competitorId: body.competitorId,
            expertId: body.expertId,
          },
        },
      });

      if (duplicatedMark) {
        return sendError(reply, 400, "Mark already exists for this aspect, competitor and expert");
      }

      const mark = await prisma.mark.create({
        data: {
          aspectId: body.aspectId,
          competitorId: body.competitorId,
          expertId: body.expertId,
          value: validateValue(body.value, context),
          observation: body.observation,
        },
      });

      await createAuditLog({
        competitionId: context.competitionId,
        action: AuditAction.CREATE,
        entityId: mark.id,
        newValue: mark,
      });

      return sendData(reply, mark, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body";
      const statusCode = message.includes("not found") ? 404 : 400;

      return sendError(reply, statusCode, message);
    }
  });

  app.put<{ Params: { id: string }; Body: MarkUpdateBody }>("/marks/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid mark id");
    }

    const existingMark = await prisma.mark.findUnique({
      where: { id },
      include: {
        aspect: {
          include: {
            subCriterion: {
              include: {
                criterion: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
        competitor: true,
        expert: true,
      },
    });

    if (!existingMark) {
      return sendError(reply, 404, "Mark not found");
    }

    if (existingMark.locked) {
      return sendError(reply, 400, "Locked mark cannot be updated");
    }

    try {
      const data: {
        value?: Prisma.Decimal;
        observation?: string | null;
        locked?: boolean;
      } = {};

      if (request.body.value !== undefined) {
        data.value = validateValue(request.body.value, {
          aspect: existingMark.aspect,
          competitor: existingMark.competitor,
          expert: existingMark.expert,
          competitionId: existingMark.competitor.competitionId,
        });
      }

      if (request.body.observation !== undefined) {
        data.observation = request.body.observation ?? null;
      }

      if (request.body.locked !== undefined) {
        if (typeof request.body.locked !== "boolean") {
          throw new Error("locked must be a boolean");
        }

        data.locked = request.body.locked;
      }

      const mark = await prisma.mark.update({
        where: { id },
        data,
      });

      const action =
        existingMark.locked !== mark.locked ? (mark.locked ? AuditAction.LOCK : AuditAction.UNLOCK) : AuditAction.UPDATE;

      await createAuditLog({
        competitionId: existingMark.competitor.competitionId,
        action,
        entityId: mark.id,
        oldValue: existingMark,
        newValue: mark,
      });

      return sendData(reply, mark);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Invalid request body");
    }
  });

  app.delete<{ Params: { id: string } }>("/marks/:id", async (request, reply) => {
    const id = parsePositiveInt(request.params.id);

    if (!id) {
      return sendError(reply, 400, "Invalid mark id");
    }

    const existingMark = await prisma.mark.findUnique({
      where: { id },
      include: {
        competitor: true,
      },
    });

    if (!existingMark) {
      return sendError(reply, 404, "Mark not found");
    }

    await prisma.mark.delete({ where: { id } });

    await createAuditLog({
      competitionId: existingMark.competitor.competitionId,
      action: AuditAction.DELETE,
      entityId: id,
      oldValue: existingMark,
    });

    return reply.status(204).send();
  });
}

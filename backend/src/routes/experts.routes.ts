import type { FastifyInstance } from "fastify";
import { ExpertRole, type ExpertRole as ExpertRoleType } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

type ExpertBody = {
  competitionId?: number;
  name?: string;
  state?: string | null;
  role?: string;
};

function parseId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function validateExpertBody(body: ExpertBody) {
  const competitionId = Number(body.competitionId);

  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new Error("competitionId must be a positive integer");
  }

  if (!body.name) {
    throw new Error("name is required");
  }

  const role = body.role ?? ExpertRole.EXPERT;

  if (!Object.values(ExpertRole).includes(role as ExpertRoleType)) {
    throw new Error("role must be EXPERT, SUPERVISOR or ADMIN");
  }

  return {
    competitionId,
    name: body.name,
    state: body.state ?? null,
    role: role as ExpertRoleType,
  };
}

export async function expertsRoutes(app: FastifyInstance) {
  app.get("/experts", async () => {
    return prisma.expert.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  app.post<{ Body: ExpertBody }>("/experts", async (request, reply) => {
    try {
      const data = validateExpertBody(request.body);

      const expert = await prisma.expert.create({
        data,
      });

      return reply.status(201).send(expert);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get<{ Params: { id: string } }>("/experts/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid expert id" });
    }

    const expert = await prisma.expert.findUnique({
      where: { id },
    });

    if (!expert) {
      return reply.status(404).send({ message: "Expert not found" });
    }

    return expert;
  });

  app.put<{ Params: { id: string }; Body: ExpertBody }>("/experts/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid expert id" });
    }

    const expertExists = await prisma.expert.findUnique({
      where: { id },
    });

    if (!expertExists) {
      return reply.status(404).send({ message: "Expert not found" });
    }

    try {
      const data = validateExpertBody(request.body);

      const expert = await prisma.expert.update({
        where: { id },
        data,
      });

      return expert;
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete<{ Params: { id: string } }>("/experts/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid expert id" });
    }

    const expertExists = await prisma.expert.findUnique({
      where: { id },
    });

    if (!expertExists) {
      return reply.status(404).send({ message: "Expert not found" });
    }

    await prisma.expert.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}

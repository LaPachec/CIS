import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { denyRoles } from "./helpers.js";

type CompetitionBody = {
  name?: string;
  location?: string | null;
  startDate?: string;
  endDate?: string;
  userRole?: string;
};

function parseId(id: string) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function parseDate(value: string | undefined, field: string) {
  if (!value) {
    throw new Error(`${field} is required`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }

  return date;
}

function validateCompetitionBody(body: CompetitionBody) {
  if (!body.name) {
    throw new Error("name is required");
  }

  return {
    name: body.name,
    location: body.location ?? null,
    startDate: parseDate(body.startDate, "startDate"),
    endDate: parseDate(body.endDate, "endDate"),
  };
}

export async function competitionsRoutes(app: FastifyInstance) {
  app.get("/competitions", async () => {
    return prisma.competition.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  app.post<{ Body: CompetitionBody }>("/competitions", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    try {
      const data = validateCompetitionBody(request.body);

      const competition = await prisma.competition.create({
        data,
      });

      return reply.status(201).send(competition);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get<{ Params: { id: string } }>("/competitions/:id", async (request, reply) => {
    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competition id" });
    }

    const competition = await prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      return reply.status(404).send({ message: "Competition not found" });
    }

    return competition;
  });

  app.put<{ Params: { id: string }; Body: CompetitionBody }>("/competitions/:id", async (request, reply) => {
    const denied = denyRoles(request, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competition id" });
    }

    const competitionExists = await prisma.competition.findUnique({
      where: { id },
    });

    if (!competitionExists) {
      return reply.status(404).send({ message: "Competition not found" });
    }

    try {
      const data = validateCompetitionBody(request.body);

      const competition = await prisma.competition.update({
        where: { id },
        data,
      });

      return competition;
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete<{ Params: { id: string } }>("/competitions/:id", async (request, reply) => {
    const denied = denyRoles({ headers: request.headers }, reply, ["EXPERT", "VIEWER"]);

    if (denied) {
      return denied;
    }

    const id = parseId(request.params.id);

    if (!id) {
      return reply.status(400).send({ message: "Invalid competition id" });
    }

    const competitionExists = await prisma.competition.findUnique({
      where: { id },
    });

    if (!competitionExists) {
      return reply.status(404).send({ message: "Competition not found" });
    }

    await prisma.competition.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}

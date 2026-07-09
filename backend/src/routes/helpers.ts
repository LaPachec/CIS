import type { FastifyReply } from "fastify";

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

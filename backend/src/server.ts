import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { aspectsRoutes } from "./routes/aspects.routes.js";
import { competitionsRoutes } from "./routes/competitions.routes.js";
import { competitorsRoutes } from "./routes/competitors.routes.js";
import { criteriaRoutes } from "./routes/criteria.routes.js";
import { expertsRoutes } from "./routes/experts.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { importRoutes } from "./routes/import.routes.js";
import { marksRoutes } from "./routes/marks.routes.js";
import { modulesRoutes } from "./routes/modules.routes.js";
import { subCriteriaRoutes } from "./routes/subcriteria.routes.js";

const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  return reply.status(500).send({
    error: "Internal server error",
  });
});

async function start() {
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  await app.register(multipart);

  await app.register(healthRoutes);
  await app.register(competitionsRoutes);
  await app.register(modulesRoutes);
  await app.register(criteriaRoutes);
  await app.register(subCriteriaRoutes);
  await app.register(aspectsRoutes);
  await app.register(competitorsRoutes);
  await app.register(expertsRoutes);
  await app.register(marksRoutes);
  await app.register(importRoutes);

  await app.listen({ port: 3333, host: "0.0.0.0" });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});

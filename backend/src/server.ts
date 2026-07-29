import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { adminRoutes } from "./routes/admin.routes.js";
import { aspectsRoutes } from "./routes/aspects.routes.js";
import { backupRoutes } from "./routes/backup.routes.js";
import { checksRoutes } from "./routes/checks.routes.js";
import { competitionsRoutes } from "./routes/competitions.routes.js";
import { competitorsRoutes } from "./routes/competitors.routes.js";
import { criteriaRoutes } from "./routes/criteria.routes.js";
import { expertsRoutes } from "./routes/experts.routes.js";
import { exportsRoutes } from "./routes/exports.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { importRoutes } from "./routes/import.routes.js";
import { locksRoutes } from "./routes/locks.routes.js";
import { moduleClosingRoutes } from "./routes/module-closing.routes.js";
import { marksRoutes } from "./routes/marks.routes.js";
import { modulesRoutes } from "./routes/modules.routes.js";
import { pdfRoutes } from "./routes/pdf.routes.js";
import { reportsRoutes } from "./routes/reports.routes.js";
import { resultsRoutes } from "./routes/results.routes.js";
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
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-user-role",
      "x-user-name",
    ],
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
  await app.register(locksRoutes);
  await app.register(moduleClosingRoutes);
  await app.register(resultsRoutes);
  await app.register(reportsRoutes);
  await app.register(checksRoutes);
  await app.register(adminRoutes);
  await app.register(exportsRoutes);
  await app.register(pdfRoutes);
  await app.register(backupRoutes);
  await app.register(importRoutes);

  await app.listen({ port: 3333, host: "0.0.0.0" });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});

import "dotenv/config";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminRoutes } from "./routes/admin.routes.js";
import { authenticate, canAccessAuthenticatedRoute } from "./plugins/auth.js";
import { aspectsRoutes } from "./routes/aspects.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
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
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.join(currentDirectory, "..", "public");
const hasFrontendBuild = existsSync(frontendDirectory);
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://172.25.10.16:5173",
  "http://172.26.96.1:5173",
  "http://192.168.56.1:5173",
  "http://172.25.10.17:5173",
];
const corsOrigins = Array.from(
  new Set([
    ...defaultCorsOrigins,
    ...(process.env.FRONTEND_URL
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []),
  ]),
);
const requestStartTimes = new WeakMap<object, number>();

function getPerformanceLabel(durationMs: number) {
  if (durationMs > 2000) {
    return "[PERF][VERY SLOW]";
  }

  if (durationMs > 800) {
    return "[PERF][SLOW]";
  }

  return "[PERF]";
}

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  return reply.status(500).send({
    error: "Internal server error",
  });
});

async function start() {
  await app.register(cors, {
    origin: corsOrigins,
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

  app.addHook("onRequest", async (request) => {
    requestStartTimes.set(request, Date.now());
  });

  app.addHook("onResponse", async (request, reply) => {
    const startTime = requestStartTimes.get(request);

    if (!startTime) {
      return;
    }

    const durationMs = Date.now() - startTime;
    const label = getPerformanceLabel(durationMs);

    app.log.info(
      `${label} ${request.method} ${request.url} ${reply.statusCode} ${durationMs}ms`,
    );
  });

  await app.register(multipart);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "cis-simulado-dev-secret",
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
  });

  if (hasFrontendBuild) {
    await app.register(fastifyStatic, {
      root: frontendDirectory,
    });
  }

  app.addHook("preHandler", async (request, reply) => {
    const pathname = request.url.split("?")[0] ?? request.url;
    const acceptsHtml = request.headers.accept?.includes("text/html");
    const isStaticAsset =
      request.method === "GET" &&
      (pathname.startsWith("/assets/") ||
        /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/i.test(pathname));

    if (
      request.method === "OPTIONS" ||
      pathname === "/health" ||
      pathname === "/auth/login" ||
      isStaticAsset ||
      (hasFrontendBuild && request.method === "GET" && acceptsHtml)
    ) {
      return;
    }

    await authenticate(request, reply);

    if (reply.sent) {
      return;
    }

    if (!request.user || !canAccessAuthenticatedRoute(request.method, pathname, request.user.role)) {
      return reply.status(403).send({
        error: "Voce nao tem permissao para realizar esta acao.",
      });
    }
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
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

  if (hasFrontendBuild) {
    app.setNotFoundHandler((request, reply) => {
      const acceptsHtml = request.headers.accept?.includes("text/html");

      if (request.method === "GET" && acceptsHtml) {
        return reply.sendFile("index.html");
      }

      return reply.status(404).send({ error: "Not found" });
    });
  }

  await app.listen({ port: Number(process.env.PORT ?? 3333), host: "0.0.0.0" });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});

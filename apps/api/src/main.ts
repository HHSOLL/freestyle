import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { assertAdminClientConfig } from "@freestyle/db";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerJobRoutes } from "./routes/jobs.routes.js";
import { registerAssetRoutes } from "./routes/assets.routes.js";
import { registerEvaluationRoutes } from "./routes/evaluations.routes.js";
import { registerOutfitRoutes } from "./routes/outfits.routes.js";
import { registerTryonRoutes } from "./routes/tryons.routes.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerWidgetAssetRoutes, registerWidgetRoutes } from "./routes/widget.routes.js";
import { buildOriginPolicy } from "./lib/originPolicy.js";

const port = Number.parseInt(process.env.PORT || "8080", 10);
const host = process.env.HOST || "0.0.0.0";

export const buildServer = () => {
  const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });
  const originPolicy = buildOriginPolicy();

  app.register(sensible);
  app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, originPolicy.isAllowedOrigin(origin) ? origin : false);
    },
    credentials: true,
  });
  app.register(multipart, {
    limits: {
      fileSize: 12 * 1024 * 1024,
      files: 1,
    },
  });

  registerHealthRoutes(app);
  registerWidgetAssetRoutes(app);

  app.register(async (v1) => {
    registerAuthRoutes(v1);
    registerJobRoutes(v1);
    registerAssetRoutes(v1);
    registerEvaluationRoutes(v1);
    registerOutfitRoutes(v1);
    registerTryonRoutes(v1);
    registerWidgetRoutes(v1);
  }, { prefix: "/v1" });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled API error");
    if (reply.sent) return;
    reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  });

  return app;
};

const shouldStartServer = () => {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  return import.meta.url === pathToFileURL(entrypoint).href;
};

const startServer = async () => {
  assertAdminClientConfig();

  const app = buildServer();
  try {
    await app.listen({ host, port });
    app.log.info({ port, host }, "API server started");
  } catch (error) {
    app.log.error({ err: error }, "Failed to start API server");
    process.exit(1);
  }
};

if (shouldStartServer()) {
  void startServer();
}

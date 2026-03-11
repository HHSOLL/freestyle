import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerJobRoutes } from "./routes/jobs.routes.js";
import { registerAssetRoutes } from "./routes/assets.routes.js";
import { registerEvaluationRoutes } from "./routes/evaluations.routes.js";
import { registerOutfitRoutes } from "./routes/outfits.routes.js";
import { registerTryonRoutes } from "./routes/tryons.routes.js";

const port = Number.parseInt(process.env.PORT || "8080", 10);
const host = process.env.HOST || "0.0.0.0";

const buildServer = () => {
  const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });

  app.register(sensible);
  app.register(cors, {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((item) => item.trim()) : true,
    credentials: true,
  });
  app.register(multipart, {
    limits: {
      fileSize: 12 * 1024 * 1024,
      files: 1,
    },
  });

  registerHealthRoutes(app);

  app.register(async (v1) => {
    registerJobRoutes(v1);
    registerAssetRoutes(v1);
    registerEvaluationRoutes(v1);
    registerOutfitRoutes(v1);
    registerTryonRoutes(v1);
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

const app = buildServer();
app
  .listen({ host, port })
  .then(() => {
    app.log.info({ port, host }, "API server started");
  })
  .catch((error) => {
    app.log.error({ err: error }, "Failed to start API server");
    process.exit(1);
  });

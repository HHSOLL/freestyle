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
import { registerFitSimulationRoutes } from "./routes/fit-simulations.routes.js";
import { registerTryonRoutes } from "./routes/tryons.routes.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerProfileRoutes } from "./routes/profile.routes.js";
import { registerClosetRoutes } from "./routes/closet.routes.js";
import { registerCanvasRoutes } from "./routes/canvas.routes.js";
import { registerCommunityRoutes } from "./routes/community.routes.js";
import { registerRuntimeAvatarRoutes } from "./routes/runtime-avatars.routes.js";
import { registerAssetGenerationRoutes } from "./routes/asset-generation.routes.js";
import { registerGarmentCertificationRoutes } from "./routes/garment-certification.routes.js";
import { registerAdminFitSimulationRoutes } from "./routes/admin-fit-simulations.routes.js";
import { registerRuntimeGarmentRoutes } from "./routes/runtime-garments.routes.js";
import { registerViewerTelemetryRoutes } from "./routes/viewer-telemetry.routes.js";
import { registerWidgetAssetRoutes, registerWidgetRoutes } from "./routes/widget.routes.js";
import { buildOriginPolicy } from "./lib/originPolicy.js";
import { LAB_API_PREFIX, LEGACY_API_PREFIX, LEGACY_WIDGET_ASSET_PREFIX, PRODUCT_API_PREFIX } from "./lib/route-namespaces.js";

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
  registerWidgetAssetRoutes(app, {
    apiBasePath: LEGACY_API_PREFIX,
    assetBasePath: LEGACY_WIDGET_ASSET_PREFIX,
  });

  app.register(async (product) => {
    product.addHook("onSend", async (_request, reply, payload) => {
      reply.header("x-freestyle-surface", "product");
      return payload;
    });

    registerAuthRoutes(product);
    registerProfileRoutes(product);
    registerClosetRoutes(product);
    registerRuntimeAvatarRoutes(product);
    registerAssetGenerationRoutes(product);
    registerGarmentCertificationRoutes(product);
    registerAdminFitSimulationRoutes(product);
    registerRuntimeGarmentRoutes(product);
    registerViewerTelemetryRoutes(product);
    registerCanvasRoutes(product);
    registerCommunityRoutes(product);
  }, { prefix: PRODUCT_API_PREFIX });

  app.register(async (legacy) => {
    legacy.addHook("onSend", async (_request, reply, payload) => {
      reply.header("x-freestyle-surface", "legacy");
      reply.header("deprecation", "true");
      return payload;
    });

    registerJobRoutes(legacy);
    registerAssetRoutes(legacy);
    registerOutfitRoutes(legacy);
    registerWidgetRoutes(legacy, {
      apiBasePath: LEGACY_API_PREFIX,
      assetBasePath: LEGACY_WIDGET_ASSET_PREFIX,
    });
  }, { prefix: LEGACY_API_PREFIX });

  app.register(async (lab) => {
    lab.addHook("onSend", async (_request, reply, payload) => {
      reply.header("x-freestyle-surface", "lab");
      return payload;
    });

    registerEvaluationRoutes(lab);
    registerFitSimulationRoutes(lab);
    registerTryonRoutes(lab);
  }, { prefix: LAB_API_PREFIX });

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

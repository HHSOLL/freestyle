import type { FastifyInstance } from "fastify";
import {
  getDiscoverLook,
  listDiscoverLooks,
} from "../modules/canvas/canvas.service.js";

export const registerDiscoverRoutes = (app: FastifyInstance) => {
  app.get("/discover/looks", async (_request, reply) => {
    const looks = await listDiscoverLooks();
    return reply.send({ looks });
  });

  app.get("/discover/looks/:slug", async (request, reply) => {
    const { slug } = request.params as { slug?: string };
    if (!slug) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "slug is required." });
    }

    const look = await getDiscoverLook(slug);
    if (!look) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Discover look not found." });
    }

    return reply.send({ look });
  });
};

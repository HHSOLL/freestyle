import type { FastifyInstance } from "fastify";
import {
  getCommunityLook,
  listCommunityLooks,
} from "../modules/canvas/canvas.service.js";

const registerSharedCommunityRoutes = (app: FastifyInstance, prefix: "/community" | "/discover") => {
  app.get(`${prefix}/looks`, async (_request, reply) => {
    const looks = await listCommunityLooks();
    return reply.send({ looks });
  });

  app.get(`${prefix}/looks/:slug`, async (request, reply) => {
    const { slug } = request.params as { slug?: string };
    if (!slug) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "slug is required." });
    }

    const look = await getCommunityLook(slug);
    if (!look) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Community look not found." });
    }

    return reply.send({ look });
  });
};

export const registerCommunityRoutes = (app: FastifyInstance) => {
  registerSharedCommunityRoutes(app, "/community");
  registerSharedCommunityRoutes(app, "/discover");
};

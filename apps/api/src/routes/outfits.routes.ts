import type { FastifyInstance } from "fastify";
import { deleteOutfitById, getOutfitBySlug, listOutfits } from "@freestyle/db";
import { requireAuth } from "../modules/auth/auth.js";

export const registerOutfitRoutes = (app: FastifyInstance) => {
  app.get("/outfits", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const outfits = await listOutfits();
    return reply.send({ outfits });
  });

  app.delete("/outfits/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    await deleteOutfitById(id);
    return reply.send({ status: "deleted" });
  });

  app.get("/outfits/share/:slug", async (request, reply) => {
    const { slug } = request.params as { slug?: string };
    if (!slug) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "slug is required." });
    }

    const outfit = await getOutfitBySlug(slug);
    if (!outfit) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Outfit not found." });
    }

    return reply.send({ outfit });
  });
};

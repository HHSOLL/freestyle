import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  createOutfit,
  deleteOutfitByIdForUser,
  getOutfitByIdForUser,
  getOutfitBySlug,
  listOutfitsForUser,
} from "@freestyle/db";
import { requireAuth } from "../modules/auth/auth.js";

const createShareSlug = () => crypto.randomBytes(6).toString("base64url");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const registerOutfitRoutes = (app: FastifyInstance) => {
  app.post("/outfits", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const body = isRecord(request.body) ? request.body : null;
    if (!body) {
      return reply
        .code(400)
        .send({ error: "VALIDATION_ERROR", message: "JSON object body is required." });
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Untitled outfit";
    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
    const previewImage = typeof body.previewImage === "string" && body.previewImage.trim() ? body.previewImage.trim() : null;
    const data =
      body.data && isRecord(body.data)
        ? body.data
        : Array.isArray(body.items)
          ? ({
              items: body.items,
              modelPhoto: typeof body.modelPhoto === "string" ? body.modelPhoto : null,
            } satisfies Record<string, unknown>)
          : null;

    if (!previewImage) {
      return reply
        .code(400)
        .send({ error: "VALIDATION_ERROR", message: "previewImage is required." });
    }

    if (!data) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "outfit data is required." });
    }

    const saved = await createOutfit({
      userId,
      shareSlug: createShareSlug(),
      title,
      description,
      previewImage,
      data,
    });

    return reply.code(201).send({
      id: saved.id,
      shareSlug: saved.share_slug,
    });
  });

  app.get("/outfits", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const outfits = await listOutfitsForUser(userId);
    return reply.send({ outfits });
  });

  app.get("/outfits/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const outfit = await getOutfitByIdForUser(id, userId);
    if (!outfit) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Outfit not found." });
    }

    return reply.send({ outfit });
  });

  app.delete("/outfits/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    await deleteOutfitByIdForUser(id, userId);
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

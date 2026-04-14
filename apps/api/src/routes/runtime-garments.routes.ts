import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assetCategorySchema,
  publishedGarmentAssetSchema,
} from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createPublishedRuntimeGarment,
  getPublishedRuntimeGarmentById,
  listPublishedRuntimeGarments,
  upsertPublishedRuntimeGarment,
} from "../modules/garments/runtime-garments.service.js";

const runtimeGarmentQuerySchema = z
  .object({
    category: assetCategorySchema.optional(),
    source_system: z.enum(["starter-catalog", "admin-domain", "api-published"]).optional(),
  })
  .strict();

export const registerRuntimeGarmentRoutes = (app: FastifyInstance) => {
  app.get("/closet/runtime-garments", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = runtimeGarmentQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    const items = await listPublishedRuntimeGarments({
      category: parsed.data.category,
      sourceSystem: parsed.data.source_system,
    });
    return reply.send({ items, total: items.length });
  });

  app.get("/admin/garments", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = runtimeGarmentQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    const items = await listPublishedRuntimeGarments({
      category: parsed.data.category,
      sourceSystem: parsed.data.source_system,
    });
    return reply.send({ items, total: items.length });
  });

  app.get("/admin/garments/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const item = await getPublishedRuntimeGarmentById(id);
    if (!item) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Runtime garment not found." });
    }

    return reply.send({ item });
  });

  app.post("/admin/garments", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = publishedGarmentAssetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const item = await createPublishedRuntimeGarment(parsed.data);
    if (!item) {
      return reply.code(409).send({
        error: "CONFLICT",
        message: "Runtime garment with the same id already exists.",
      });
    }

    return reply.code(201).send({ item });
  });

  app.put("/admin/garments/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const parsed = publishedGarmentAssetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    if (parsed.data.id !== id) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Body id must match route id.",
      });
    }

    const item = await upsertPublishedRuntimeGarment(parsed.data);
    return reply.code(200).send({ item });
  });
};

import type { FastifyInstance } from "fastify";
import { deleteAssetByIdForUser, getAssetByIdForUser } from "@freestyle/db";
import { requireAuth } from "../modules/auth/auth.js";
import { listUserAssets } from "../modules/assets/assets.service.js";

const toPositiveInt = (value: unknown, fallback: number) => {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const registerAssetRoutes = (app: FastifyInstance) => {
  app.get("/assets/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const asset = await getAssetByIdForUser(id, userId);
    if (!asset) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Asset not found." });
    }

    return reply.send(asset);
  });

  app.delete("/assets/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    await deleteAssetByIdForUser(id, userId);
    return reply.send({ status: "deleted" });
  });

  app.get("/assets", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const query = request.query as Record<string, unknown>;
    const status =
      query.status === "pending" || query.status === "ready" || query.status === "failed"
        ? query.status
        : undefined;
    const category = typeof query.category === "string" && query.category.trim() ? query.category.trim() : undefined;
    const page = toPositiveInt(query.page, 1);
    const pageSize = Math.min(100, toPositiveInt(query.page_size, 20));

    const result = await listUserAssets({
      userId,
      status,
      category,
      page,
      pageSize,
    });

    return reply.send(result);
  });
};

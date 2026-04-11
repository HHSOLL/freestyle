import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../modules/auth/auth.js";
import {
  deleteClosetItem,
  getClosetItem,
  listClosetItems,
  updateClosetItem,
} from "../modules/closet/closet.service.js";

const closetQuerySchema = z.object({
  status: z.enum(["pending", "ready", "failed"]).optional(),
  category: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export const registerClosetRoutes = (app: FastifyInstance) => {
  app.get("/closet/items", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = closetQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    const result = await listClosetItems({
      userId,
      status: parsed.data.status,
      category: parsed.data.category,
      page: parsed.data.page,
      pageSize: parsed.data.page_size,
    });

    return reply.send(result);
  });

  app.get("/closet/items/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const item = await getClosetItem(userId, id);
    if (!item) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Closet item not found." });
    }

    return reply.send({ item });
  });

  app.patch("/closet/items/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    try {
      const item = await updateClosetItem({
        userId,
        id,
        body: request.body,
      });

      if (!item) {
        return reply.code(404).send({ error: "NOT_FOUND", message: "Closet item not found." });
      }

      return reply.send({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid payload.",
        });
      }

      throw error;
    }
  });

  app.delete("/closet/items/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    await deleteClosetItem(userId, id);
    return reply.send({ status: "deleted" });
  });
};

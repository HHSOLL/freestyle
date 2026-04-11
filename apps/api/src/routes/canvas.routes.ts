import type { FastifyInstance } from "fastify";
import { canvasLookInputSchema } from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createCanvasLook,
  deleteCanvasLookForUser,
  getCanvasLookForUser,
  listCanvasLooksForUser,
} from "../modules/canvas/canvas.service.js";

export const registerCanvasRoutes = (app: FastifyInstance) => {
  app.post("/canvas/looks", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = canvasLookInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const saved = await createCanvasLook(userId, parsed.data);
    return reply.code(201).send({
      id: saved.id,
      shareSlug: saved.share_slug,
    });
  });

  app.get("/canvas/looks", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const looks = await listCanvasLooksForUser(userId);
    return reply.send({ looks });
  });

  app.get("/canvas/looks/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const look = await getCanvasLookForUser(userId, id);
    if (!look) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Canvas look not found." });
    }

    return reply.send({ look });
  });

  app.delete("/canvas/looks/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    await deleteCanvasLookForUser(userId, id);
    return reply.send({ status: "deleted" });
  });
};

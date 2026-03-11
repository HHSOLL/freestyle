import type { FastifyInstance } from "fastify";
import { createTryonInputSchema } from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createTryonJob,
  getTryonForOwner,
  TryonAccessError,
} from "../modules/tryons/tryons.service.js";

export const registerTryonRoutes = (app: FastifyInstance) => {
  app.post("/jobs/tryons", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = createTryonInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    try {
      const { tryon, job } = await createTryonJob(userId, parsed.data);
      return reply.code(201).send({ job_id: job.id, tryon_id: tryon.id });
    } catch (error) {
      if (error instanceof TryonAccessError) {
        return reply.code(404).send({ error: "NOT_FOUND", message: error.message });
      }
      throw error;
    }
  });

  app.get("/tryons/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const params = request.params as { id?: string };
    const id = params.id?.trim();
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const row = await getTryonForOwner(userId, id);
    if (!row) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Try-on not found." });
    }

    return reply.send(row);
  });
};

import type { FastifyInstance } from "fastify";
import { evaluateOutfitInputSchema } from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createEvaluationJob,
  getEvaluationForUser,
} from "../modules/evaluations/evaluations.service.js";

export const registerEvaluationRoutes = (app: FastifyInstance) => {
  app.post("/jobs/evaluations", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = evaluateOutfitInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const { evaluation, job } = await createEvaluationJob(userId, parsed.data);
    return reply.code(201).send({ job_id: job.id, evaluation_id: evaluation.id });
  });

  app.get("/evaluations/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const params = request.params as { id?: string };
    const id = params.id?.trim();
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const row = await getEvaluationForUser(userId, id);
    if (!row) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Evaluation not found." });
    }

    return reply.send(row);
  });
};

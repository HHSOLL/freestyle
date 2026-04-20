import type { FastifyInstance } from "fastify";
import { createFitSimulationInputSchema } from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createFitSimulationJob,
  FitSimulationCreateError,
  getFitSimulationForUser,
} from "../modules/fit-simulations/fit-simulations.service.js";

export const registerFitSimulationRoutes = (app: FastifyInstance) => {
  app.post("/jobs/fit-simulations", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = createFitSimulationInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    try {
      const { fitSimulation, job } = await createFitSimulationJob(userId, parsed.data);
      return reply.code(201).send({
        job_id: job.id,
        fit_simulation_id: fitSimulation.id,
      });
    } catch (error) {
      if (error instanceof FitSimulationCreateError) {
        const code = error.statusCode === 404 ? "NOT_FOUND" : "PRECONDITION_FAILED";
        return reply.code(error.statusCode).send({
          error: code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  app.get("/fit-simulations/:id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const params = request.params as { id?: string };
    const id = params.id?.trim();
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const row = await getFitSimulationForUser(userId, id);
    if (!row) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Fit simulation not found." });
    }

    return reply.send({
      fitSimulation: row,
    });
  });
};


import type { FastifyInstance } from "fastify";
import { fitSimulationAdminInspectionResponseSchema } from "@freestyle/contracts";
import { requireAdminAuth } from "../modules/auth/auth.js";
import { getFitSimulationInspectionById } from "../modules/fit-simulations/fit-simulations.service.js";

export const registerAdminFitSimulationRoutes = (app: FastifyInstance) => {
  app.get("/admin/fit-simulations/:id", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const inspection = await getFitSimulationInspectionById(id);
    if (!inspection) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Fit simulation not found." });
    }

    return reply.send(fitSimulationAdminInspectionResponseSchema.parse(inspection));
  });
};

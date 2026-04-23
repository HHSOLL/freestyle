import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  fitSimulationAdminInspectionListResponseSchema,
  fitSimulationAdminInspectionResponseSchema,
  fitSimulationStatusSchema,
} from "@freestyle/contracts";
import { requireAdminAuth } from "../modules/auth/auth.js";
import {
  getFitSimulationInspectionById,
  listFitSimulationInspectionSummaries,
} from "../modules/fit-simulations/fit-simulations.service.js";

const adminFitSimulationListQuerySchema = z
  .object({
    garment_variant_id: z.string().trim().min(1).optional(),
    status: fitSimulationStatusSchema.optional(),
    has_artifact_lineage: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return undefined;
        }
        return value === "true";
      }),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const registerAdminFitSimulationRoutes = (app: FastifyInstance) => {
  app.get("/admin/fit-simulations", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const parsed = adminFitSimulationListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    const inspectionList = await listFitSimulationInspectionSummaries({
      garmentVariantId: parsed.data.garment_variant_id,
      status: parsed.data.status,
      hasArtifactLineage: parsed.data.has_artifact_lineage,
      limit: parsed.data.limit,
    });

    return reply.send(fitSimulationAdminInspectionListResponseSchema.parse(inspectionList));
  });

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

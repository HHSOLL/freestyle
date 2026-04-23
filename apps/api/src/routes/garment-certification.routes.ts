import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assetCategorySchema,
  garmentCertificationItemResponseSchema,
  garmentCertificationListResponseSchema,
} from "@freestyle/contracts";
import { requireAdminAuth } from "../modules/auth/auth.js";
import {
  GarmentCertificationUnavailableError,
  getGarmentCertificationById,
  listGarmentCertifications,
} from "../modules/garments/garment-certification.service.js";

const garmentCertificationQuerySchema = z
  .object({
    category: assetCategorySchema.optional(),
  })
  .strict();

export const registerGarmentCertificationRoutes = (app: FastifyInstance) => {
  app.get("/admin/garment-certifications", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const parsed = garmentCertificationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    try {
      const bundle = await listGarmentCertifications({
        category: parsed.data.category,
      });
      return reply.send(garmentCertificationListResponseSchema.parse(bundle));
    } catch (error) {
      if (error instanceof GarmentCertificationUnavailableError) {
        return reply.code(503).send({
          error: "SERVICE_UNAVAILABLE",
          message: error.message,
        });
      }
      throw error;
    }
  });

  app.get("/admin/garment-certifications/:id", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    try {
      const item = await getGarmentCertificationById(id);
      if (!item) {
        return reply.code(404).send({ error: "NOT_FOUND", message: "Garment certification not found." });
      }

      return reply.send(garmentCertificationItemResponseSchema.parse(item));
    } catch (error) {
      if (error instanceof GarmentCertificationUnavailableError) {
        return reply.code(503).send({
          error: "SERVICE_UNAVAILABLE",
          message: error.message,
        });
      }
      throw error;
    }
  });
};

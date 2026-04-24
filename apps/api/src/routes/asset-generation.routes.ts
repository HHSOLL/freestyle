import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assetGenerationCreateResponseSchema,
  assetGenerationListResponseSchema,
  assetGenerationProviderSchema,
  assetGenerationStatusSchema,
} from "@freestyle/contracts";
import { requireAdminAuth } from "../modules/auth/auth.js";
import {
  AssetGenerationProviderRequestError,
  AssetGenerationProviderUnconfiguredError,
  AssetGenerationValidationError,
  createAssetGenerationRequest,
  getAssetGenerationRequestById,
  listAssetGenerationRequests,
} from "../modules/assets/asset-generation.service.js";

const assetGenerationQuerySchema = z
  .object({
    status: assetGenerationStatusSchema.optional(),
    provider: assetGenerationProviderSchema.optional(),
  })
  .strict();

export const registerAssetGenerationRoutes = (app: FastifyInstance) => {
  app.get("/admin/asset-generation", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const parsed = assetGenerationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    return reply.send(assetGenerationListResponseSchema.parse(listAssetGenerationRequests(parsed.data)));
  });

  app.get("/admin/asset-generation/:id", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const item = getAssetGenerationRequestById(id);
    if (!item) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Asset generation request not found." });
    }

    return reply.send(assetGenerationCreateResponseSchema.parse({ item }));
  });

  app.post("/admin/asset-generation", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    try {
      const response = await createAssetGenerationRequest(request.body, userId);
      return reply.code(202).send(assetGenerationCreateResponseSchema.parse(response));
    } catch (error) {
      if (error instanceof AssetGenerationProviderUnconfiguredError) {
        return reply.code(503).send({
          error: "PROVIDER_UNCONFIGURED",
          message: error.message,
          provider: error.providerId,
        });
      }
      if (error instanceof AssetGenerationProviderRequestError) {
        return reply.code(502).send({
          error: "PROVIDER_REQUEST_FAILED",
          message: error.message,
          provider: error.providerId,
        });
      }
      if (error instanceof AssetGenerationValidationError) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: error.message,
          issues: error.issues,
        });
      }
      throw error;
    }
  });
};

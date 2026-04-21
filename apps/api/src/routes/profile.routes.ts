import type { FastifyInstance } from "fastify";
import {
  bodyProfileConflictResponseSchema,
  bodyProfileGetResponseSchema,
  bodyProfilePutResponseSchema,
  bodyProfileUpsertInputSchema,
} from "@freestyle/contracts";
import { requireAuth } from "../modules/auth/auth.js";
import {
  BodyProfileRevisionConflictError,
  getBodyProfileRecordForUser,
  upsertBodyProfileRecordForUser,
} from "../modules/profile/body-profile.repository.js";

export const registerProfileRoutes = (app: FastifyInstance) => {
  app.get("/profile/body-profile", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const bodyProfile = await getBodyProfileRecordForUser(userId);
    return reply.send(bodyProfileGetResponseSchema.parse({ bodyProfile }));
  });

  app.put("/profile/body-profile", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = bodyProfileUpsertInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    let bodyProfile;
    try {
      bodyProfile = await upsertBodyProfileRecordForUser(userId, parsed.data);
    } catch (error) {
      if (error instanceof BodyProfileRevisionConflictError) {
        return reply.code(409).send(
          bodyProfileConflictResponseSchema.parse({
            error: "REVISION_CONFLICT",
            message: "Body profile revision mismatch.",
            currentBodyProfile: error.currentBodyProfile,
          }),
        );
      }
      throw error;
    }
    return reply.code(200).send(bodyProfilePutResponseSchema.parse({ bodyProfile }));
  });
};

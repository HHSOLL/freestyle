import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  publishedRuntimeAvatarItemResponseSchema,
  publishedRuntimeAvatarListResponseSchema,
} from "@freestyle/contracts";
import { requireAdminAuth } from "../modules/auth/auth.js";
import {
  getPublishedRuntimeAvatarById,
  listPublishedRuntimeAvatars,
} from "../modules/avatars/runtime-avatars.service.js";

const adminRuntimeAvatarQuerySchema = z
  .object({
    source_system: z.enum(["mpfb2", "charmorph", "runtime-fallback"]).optional(),
    approval_state: z
      .enum([
        "DRAFT",
        "TECH_CANDIDATE",
        "VISUAL_CANDIDATE",
        "FIT_CANDIDATE",
        "CERTIFIED",
        "PUBLISHED",
        "DEPRECATED",
        "REJECTED",
      ])
      .optional(),
  })
  .strict();

export const registerRuntimeAvatarRoutes = (app: FastifyInstance) => {
  app.get("/admin/avatars", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const parsed = adminRuntimeAvatarQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid query.",
      });
    }

    const items = listPublishedRuntimeAvatars({
      approvalState: parsed.data.approval_state,
      sourceSystem: parsed.data.source_system,
    });

    return reply.send(
      publishedRuntimeAvatarListResponseSchema.parse({
        items,
        total: items.length,
      }),
    );
  });

  app.get("/admin/avatars/:id", async (request, reply) => {
    const userId = await requireAdminAuth(request, reply);
    if (!userId) return;

    const { id } = request.params as { id?: string };
    if (!id) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: "id is required." });
    }

    const item = getPublishedRuntimeAvatarById(id);
    if (!item) {
      return reply.code(404).send({ error: "NOT_FOUND", message: "Runtime avatar not found." });
    }

    return reply.send(
      publishedRuntimeAvatarItemResponseSchema.parse({
        item,
      }),
    );
  });
};

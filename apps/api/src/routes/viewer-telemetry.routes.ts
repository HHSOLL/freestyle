import { ZodError } from "zod";
import type { FastifyInstance } from "fastify";
import { recordViewerTelemetryEnvelope } from "../modules/telemetry/viewer-telemetry.service.js";

export const registerViewerTelemetryRoutes = (app: FastifyInstance) => {
  app.post("/telemetry/viewer", async (request, reply) => {
    try {
      const result = recordViewerTelemetryEnvelope(request.body);
      request.log.info(
        {
          viewerTelemetry: {
            receivedCount: result.received_count,
            acceptedCount: result.accepted_count,
            recommendedActions: result.recommended_actions,
          },
        },
        "Viewer telemetry accepted",
      );
      return reply.code(202).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid viewer telemetry payload.",
        });
      }

      throw error;
    }
  });
};

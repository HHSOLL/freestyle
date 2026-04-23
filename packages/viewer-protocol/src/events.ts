import { z } from "zod";
import { viewerTelemetryEventSchema } from "./telemetry.js";

export const fitPreviewReadyEventSchema = z
  .object({
    garments: z.array(
      z
        .object({
          garmentId: z.string().trim().min(1).max(160),
          size: z.string().trim().min(1).max(64).optional(),
        })
        .strict(),
    ),
    source: z.enum(["cache", "worker", "static-fit"]),
  })
  .strict();

export const fitHqReadyEventSchema = z
  .object({
    artifactId: z.string().trim().min(1).max(160).optional(),
    cacheKey: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const viewerErrorEventSchema = z
  .object({
    code: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(512),
  })
  .strict();

export const viewerEventEnvelopeSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("fit:preview-ready"),
      payload: fitPreviewReadyEventSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("fit:hq-ready"),
      payload: fitHqReadyEventSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("metrics"),
      payload: viewerTelemetryEventSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      payload: viewerErrorEventSchema,
    })
    .strict(),
]);

export type FitHqReadyEvent = z.infer<typeof fitHqReadyEventSchema>;
export type FitPreviewReadyEvent = z.infer<typeof fitPreviewReadyEventSchema>;
export type ViewerErrorEvent = z.infer<typeof viewerErrorEventSchema>;
export type ViewerEventEnvelope = z.infer<typeof viewerEventEnvelopeSchema>;

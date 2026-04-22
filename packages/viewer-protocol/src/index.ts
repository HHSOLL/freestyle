import { z } from "zod";
import {
  bodySignatureSchema,
  fitMetricsJsonSchema,
} from "../../asset-schema/src/index.js";

export const viewerRenderBackendSchema = z.enum(["webgl2", "webgpu"]);

export const viewerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("load-avatar"),
    avatarId: z.string().trim().min(1).max(160),
    bodySignature: bodySignatureSchema.optional(),
  }),
  z.object({
    type: z.literal("apply-garments"),
    garments: z
      .array(
        z
          .object({
            garmentId: z.string().trim().min(1).max(160),
            size: z.string().trim().min(1).max(64).optional(),
          })
          .strict(),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("set-camera-preset"),
    preset: z.string().trim().min(1).max(120),
  }),
  z.object({
    type: z.literal("set-quality-mode"),
    mode: z.enum(["low", "balanced", "high"]),
  }),
  z.object({
    type: z.literal("request-hq-fit"),
  }),
]);

export const previewWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INIT_SOLVER"),
    backend: z.enum(["transferable-array-buffer", "shared-array-buffer"]),
  }),
  z.object({
    type: z.literal("SET_BODY_SIGNATURE"),
    bodySignature: bodySignatureSchema,
  }),
  z.object({
    type: z.literal("SET_COLLISION_BODY"),
    assetPath: z.string().trim().min(1).max(512),
  }),
  z.object({
    type: z.literal("SET_GARMENT_FIT_MESH"),
    garmentId: z.string().trim().min(1).max(160),
    assetPath: z.string().trim().min(1).max(512),
  }),
  z.object({
    type: z.literal("SET_MATERIAL_PHYSICS"),
    garmentId: z.string().trim().min(1).max(160),
    materialPath: z.string().trim().min(1).max(512),
  }),
  z.object({
    type: z.literal("SOLVE_PREVIEW"),
    garmentId: z.string().trim().min(1).max(160),
  }),
  z.object({
    type: z.literal("GET_DEFORMATION"),
    garmentId: z.string().trim().min(1).max(160),
  }),
  z.object({
    type: z.literal("DISPOSE_GARMENT"),
    garmentId: z.string().trim().min(1).max(160),
  }),
  z.object({
    type: z.literal("DISPOSE_SOLVER"),
  }),
]);

export const viewerTelemetryEventSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    value: z.number().optional(),
    tags: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export const hqArtifactEnvelopeSchema = z
  .object({
    cacheKey: z.string().trim().min(1).max(256),
    artifactLineageId: z.string().trim().min(1).max(160),
    bodySignature: bodySignatureSchema,
    metrics: fitMetricsJsonSchema,
    artifacts: z
      .object({
        drapedGlb: z.string().trim().min(1).max(512),
        fitMapJson: z.string().trim().min(1).max(512),
        metricsJson: z.string().trim().min(1).max(512),
        previewPng: z.string().trim().min(1).max(512),
        deformationCache: z.string().trim().min(1).max(512),
      })
      .strict(),
  })
  .strict();

export type HqArtifactEnvelope = z.infer<typeof hqArtifactEnvelopeSchema>;
export type PreviewWorkerMessage = z.infer<typeof previewWorkerMessageSchema>;
export type ViewerCommand = z.infer<typeof viewerCommandSchema>;
export type ViewerTelemetryEvent = z.infer<typeof viewerTelemetryEventSchema>;

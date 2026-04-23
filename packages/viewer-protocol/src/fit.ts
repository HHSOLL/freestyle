import { z } from "zod";
import { bodySignatureSchema, fitMetricsJsonSchema } from "@freestyle/asset-schema";

export const previewTransportBackendSchema = z.enum([
  "transferable-array-buffer",
  "shared-array-buffer",
]);

export const previewWorkerMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("INIT_SOLVER"),
      backend: previewTransportBackendSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_BODY_SIGNATURE"),
      bodySignature: bodySignatureSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_COLLISION_BODY"),
      assetPath: z.string().trim().min(1).max(512),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_GARMENT_FIT_MESH"),
      garmentId: z.string().trim().min(1).max(160),
      assetPath: z.string().trim().min(1).max(512),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_MATERIAL_PHYSICS"),
      garmentId: z.string().trim().min(1).max(160),
      materialPath: z.string().trim().min(1).max(512),
    })
    .strict(),
  z
    .object({
      type: z.literal("SOLVE_PREVIEW"),
      garmentId: z.string().trim().min(1).max(160),
    })
    .strict(),
  z
    .object({
      type: z.literal("GET_DEFORMATION"),
      garmentId: z.string().trim().min(1).max(160),
    })
    .strict(),
  z
    .object({
      type: z.literal("DISPOSE_GARMENT"),
      garmentId: z.string().trim().min(1).max(160),
    })
    .strict(),
  z
    .object({
      type: z.literal("DISPOSE_SOLVER"),
    })
    .strict(),
]);

export const fitArtifactCacheKeyPartsSchema = z
  .object({
    avatarModelVersion: z.string().trim().min(1).max(120),
    bodySignatureHash: z.string().trim().min(1).max(128),
    poseFamily: z.string().trim().min(1).max(120),
    garmentId: z.string().trim().min(1).max(160),
    garmentVersion: z.string().trim().min(1).max(120),
    selectedSize: z.string().trim().min(1).max(64),
    materialPhysicsVersion: z.string().trim().min(1).max(120),
    solverVersion: z.string().trim().min(1).max(120),
    fitPolicyVersion: z.string().trim().min(1).max(120),
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

export type FitArtifactCacheKeyParts = z.infer<typeof fitArtifactCacheKeyPartsSchema>;
export type HqArtifactEnvelope = z.infer<typeof hqArtifactEnvelopeSchema>;
export type PreviewTransportBackend = z.infer<typeof previewTransportBackendSchema>;
export type PreviewWorkerMessage = z.infer<typeof previewWorkerMessageSchema>;

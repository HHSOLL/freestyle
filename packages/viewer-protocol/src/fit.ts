import { z } from "zod";
import { bodySignatureSchema, fitMetricsJsonSchema } from "@freestyle/asset-schema";
import {
  garmentAnchorIdSchema,
  garmentCollisionZoneSchema,
  garmentMaterialProfileSchema,
  garmentSimProxySchema,
} from "@freestyle/contracts";
import {
  defaultFitKernelBufferTransport,
  fitKernelExecutionModes,
  fitKernelPreviewBackendIds,
  fitKernelPreviewDeformationSchemaVersion,
  fitKernelPreviewDeformationTransferModes,
  fitKernelPreviewEngineKinds,
  fitKernelPreviewEngineStatuses,
  fitKernelPreviewEngineTransports,
  fitKernelPreviewFallbackReasons,
  fitKernelPreviewFrameSchemaVersion,
  fitKernelPreviewSolverKinds,
  fitKernelBufferTransports,
  type FitKernelBufferTransport,
} from "@freestyle/fit-kernel";

export const previewTransportBackendSchema = z.enum(fitKernelBufferTransports);
export const previewTransportBackendDefault = defaultFitKernelBufferTransport;
export const previewKernelExecutionModeSchema = z.enum(fitKernelExecutionModes);
export const previewKernelBackendSchema = z.enum(fitKernelPreviewBackendIds);
export const previewKernelSolverKindSchema = z.enum(fitKernelPreviewSolverKinds);
export const previewEngineKindSchema = z.enum(fitKernelPreviewEngineKinds);
export const previewEngineStatusKindSchema = z.enum(fitKernelPreviewEngineStatuses);
export const previewEngineTransportSchema = z.enum(fitKernelPreviewEngineTransports);
export const previewEngineFallbackReasonSchema = z.enum(fitKernelPreviewFallbackReasons);
export const previewDeformationTransferModeSchema = z.enum(
  fitKernelPreviewDeformationTransferModes,
);
export const previewBodyCollisionSchemaVersion = "preview-body-collision.v1";

export const previewBodyCollisionSchema = z
  .object({
    schemaVersion: z.literal(previewBodyCollisionSchemaVersion),
    avatarId: z.string().trim().min(1).max(160),
    bodySignatureHash: z.string().trim().min(1).max(128),
    colliders: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(64),
            zone: garmentCollisionZoneSchema,
            kind: z.enum(["capsule", "sphere"]),
            radiusCm: z.number().positive().max(50),
            halfHeightCm: z.number().positive().max(100).optional(),
            anchorId: garmentAnchorIdSchema.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const previewFrameStateSchema = z
  .object({
    initialized: z.boolean(),
    lastAnchorWorld: z.tuple([z.number(), z.number(), z.number()]),
    rotationRad: z.tuple([z.number(), z.number(), z.number()]),
    rotationVelocity: z.tuple([z.number(), z.number(), z.number()]),
    positionOffset: z.tuple([z.number(), z.number(), z.number()]),
    positionVelocity: z.tuple([z.number(), z.number(), z.number()]),
  })
  .strict();

export const previewFrameRequestSchema = z
  .object({
    schemaVersion: z.literal(fitKernelPreviewFrameSchemaVersion),
    sessionId: z.string().trim().min(1).max(160),
    sequence: z.number().int().nonnegative(),
    backend: previewKernelBackendSchema,
    elapsedTimeSeconds: z.number().nonnegative(),
    deltaSeconds: z.number().positive(),
    featureSnapshot: z
      .object({
        hasWorker: z.boolean(),
        hasOffscreenCanvas: z.boolean(),
        hasWebGPU: z.boolean(),
        crossOriginIsolated: z.boolean(),
      })
      .strict(),
    currentAnchorWorld: z.tuple([z.number(), z.number(), z.number()]),
    state: previewFrameStateSchema,
    config: z
      .object({
        profileId: z.enum([
          "hair-sway",
          "hair-long",
          "hair-bob",
          "garment-soft",
          "garment-loose",
        ]),
        stiffness: z.number().positive(),
        damping: z.number().positive(),
        influence: z.number().positive(),
        looseness: z.number().positive(),
        scaleCompensation: z.number().positive(),
        maxYawDeg: z.number().nonnegative(),
        maxPitchDeg: z.number().nonnegative(),
        maxRollDeg: z.number().nonnegative(),
        idleAmplitudeDeg: z.number().nonnegative().optional(),
        idleFrequencyHz: z.number().positive().optional(),
        verticalBobCm: z.number().nonnegative().optional(),
        lateralSwingCm: z.number().nonnegative().optional(),
        baseOffsetY: z.number(),
      })
      .strict(),
  })
  .strict();

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
      collisionBody: previewBodyCollisionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_GARMENT_FIT_MESH"),
      garmentId: z.string().trim().min(1).max(160),
      fitMesh: garmentSimProxySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_MATERIAL_PHYSICS"),
      garmentId: z.string().trim().min(1).max(160),
      materialProfile: garmentMaterialProfileSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SOLVE_PREVIEW"),
      garmentId: z.string().trim().min(1).max(160),
      frame: previewFrameRequestSchema,
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

export const previewFrameResultSchema = z
  .object({
    schemaVersion: z.literal(fitKernelPreviewFrameSchemaVersion),
    sessionId: z.string().trim().min(1).max(160),
    sequence: z.number().int().nonnegative(),
    backend: previewKernelBackendSchema,
    state: previewFrameStateSchema,
    rotationRad: z.tuple([z.number(), z.number(), z.number()]),
    position: z.tuple([z.number(), z.number(), z.number()]),
    targetRotationRad: z.tuple([z.number(), z.number(), z.number()]),
    targetPosition: z.tuple([z.number(), z.number(), z.number()]),
    angularEnergy: z.number(),
    positionalEnergy: z.number(),
    anchorEnergy: z.number(),
    shouldContinue: z.boolean(),
  })
  .strict();

export const previewFrameMetricsSchema = z
  .object({
    solverKind: previewKernelSolverKindSchema,
    executionMode: previewKernelExecutionModeSchema,
    backend: previewKernelBackendSchema,
    solveDurationMs: z.number().nonnegative(),
    angularEnergy: z.number().nonnegative(),
    positionalEnergy: z.number().nonnegative(),
    anchorEnergy: z.number().nonnegative(),
    shouldContinue: z.boolean(),
  })
  .strict();

export const previewWorkerResultEnvelopeSchema = z
  .object({
    type: z.literal("PREVIEW_FRAME_RESULT"),
    result: previewFrameResultSchema,
    metrics: previewFrameMetricsSchema,
  })
  .strict();

export const previewDeformationSchema = z
  .object({
    schemaVersion: z.literal(fitKernelPreviewDeformationSchemaVersion),
    garmentId: z.string().trim().min(1).max(160),
    sessionId: z.string().trim().min(1).max(160),
    sequence: z.number().int().nonnegative(),
    backend: previewKernelBackendSchema,
    executionMode: previewKernelExecutionModeSchema,
    transferMode: previewDeformationTransferModeSchema,
    rotationRad: z.tuple([z.number(), z.number(), z.number()]),
    position: z.tuple([z.number(), z.number(), z.number()]),
    settled: z.boolean(),
  })
  .strict();

export const previewDeformationResultEnvelopeSchema = z
  .object({
    type: z.literal("PREVIEW_DEFORMATION"),
    deformation: previewDeformationSchema,
  })
  .strict();

export const previewRuntimeSnapshotSchemaVersion = "preview-runtime-snapshot.v1";
export const previewEngineStatusSchemaVersion = "preview-engine-status.v1";

export const previewRuntimeSnapshotSchema = z
  .object({
    schemaVersion: z.literal(previewRuntimeSnapshotSchemaVersion),
    sessionId: z.string().trim().min(1).max(160),
    sequence: z.number().int().nonnegative(),
    executionMode: previewKernelExecutionModeSchema,
    backend: previewKernelBackendSchema,
    solverKind: previewKernelSolverKindSchema.optional(),
    solveDurationMs: z.number().nonnegative(),
    angularEnergy: z.number().nonnegative(),
    positionalEnergy: z.number().nonnegative(),
    anchorEnergy: z.number().nonnegative(),
    shouldContinue: z.boolean(),
    settled: z.boolean(),
  })
  .strict();

export const previewEngineStatusSchema = z
  .object({
    schemaVersion: z.literal(previewEngineStatusSchemaVersion),
    engineKind: previewEngineKindSchema,
    executionMode: previewKernelExecutionModeSchema,
    backend: previewKernelBackendSchema,
    transport: previewEngineTransportSchema,
    status: previewEngineStatusKindSchema,
    fallbackReason: previewEngineFallbackReasonSchema.optional(),
    featureSnapshot: z
      .object({
        hasWorker: z.boolean(),
        hasOffscreenCanvas: z.boolean(),
        hasWebGPU: z.boolean(),
        crossOriginIsolated: z.boolean(),
      })
      .strict(),
  })
  .strict();

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
export type PreviewBodyCollision = z.infer<typeof previewBodyCollisionSchema>;
export type PreviewDeformation = z.infer<typeof previewDeformationSchema>;
export type PreviewEngineStatus = z.infer<typeof previewEngineStatusSchema>;
export type PreviewRuntimeSnapshot = z.infer<typeof previewRuntimeSnapshotSchema>;
export type PreviewTransportBackend = FitKernelBufferTransport;
export type PreviewWorkerMessage = z.infer<typeof previewWorkerMessageSchema>;
export type PreviewDeformationResultEnvelope = z.infer<
  typeof previewDeformationResultEnvelopeSchema
>;
export type PreviewWorkerResultEnvelope = z.infer<typeof previewWorkerResultEnvelopeSchema>;

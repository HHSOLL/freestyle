import { z } from "zod";
import { bodySignatureSchema } from "@freestyle/asset-schema";

export const viewerRenderBackendSchema = z.enum(["webgl2", "webgpu"]);
export const viewerCameraPresetSchema = z.enum([
  "full-body-front",
  "full-body-three-quarter",
  "full-body-front-tight",
]);
export const viewerQualityModeSchema = z.enum(["low", "balanced", "high"]);

export const viewerGarmentSelectionSchema = z
  .object({
    garmentId: z.string().trim().min(1).max(160),
    size: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const viewerLoadAvatarCommandSchema = z
  .object({
    type: z.literal("load-avatar"),
    avatarId: z.string().trim().min(1).max(160),
    bodySignature: bodySignatureSchema.optional(),
  })
  .strict();

export const viewerApplyGarmentsCommandSchema = z
  .object({
    type: z.literal("apply-garments"),
    garments: z.array(viewerGarmentSelectionSchema),
  })
  .strict();

export const viewerCommandSchema = z.discriminatedUnion("type", [
  viewerLoadAvatarCommandSchema,
  viewerApplyGarmentsCommandSchema,
  z
    .object({
      type: z.literal("set-camera-preset"),
      preset: viewerCameraPresetSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("set-quality-mode"),
      mode: viewerQualityModeSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("request-hq-fit"),
    })
    .strict(),
]);

export const viewerSceneSchema = z
  .object({
    avatar: z
      .object({
        avatarId: z.string().trim().min(1).max(160),
        bodySignature: bodySignatureSchema.optional(),
      })
      .strict(),
    garments: z.array(viewerGarmentSelectionSchema),
    cameraPreset: viewerCameraPresetSchema,
    qualityMode: viewerQualityModeSchema,
    selectedItemId: z.string().trim().min(1).max(160).nullable().optional(),
    backgroundColor: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type ViewerCameraPreset = z.infer<typeof viewerCameraPresetSchema>;
export type ViewerCommand = z.infer<typeof viewerCommandSchema>;
export type ViewerGarmentSelection = z.infer<typeof viewerGarmentSelectionSchema>;
export type ViewerQualityMode = z.infer<typeof viewerQualityModeSchema>;
export type ViewerRenderBackend = z.infer<typeof viewerRenderBackendSchema>;
export type ViewerScene = z.infer<typeof viewerSceneSchema>;

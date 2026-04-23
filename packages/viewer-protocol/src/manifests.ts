import { z } from "zod";
import { assetApprovalStateSchema } from "@freestyle/asset-schema";
import { viewerRenderBackendSchema } from "./commands.js";

export const viewerManifestAssetReferenceSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    version: z.string().trim().min(1).max(120),
    manifestPath: z.string().trim().min(1).max(512),
    approvalState: assetApprovalStateSchema,
  })
  .strict();

export const viewerManifestEnvelopeSchema = z
  .object({
    schemaVersion: z.literal("viewer-manifest.v1"),
    renderBackend: viewerRenderBackendSchema,
    avatar: viewerManifestAssetReferenceSchema,
    garments: z.array(viewerManifestAssetReferenceSchema).default([]),
    generatedAt: z.iso.datetime().optional(),
  })
  .strict();

export type ViewerManifestAssetReference = z.infer<typeof viewerManifestAssetReferenceSchema>;
export type ViewerManifestEnvelope = z.infer<typeof viewerManifestEnvelopeSchema>;

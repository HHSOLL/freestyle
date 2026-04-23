import { z } from "zod";
import { assetQualityReportSchema } from "./quality.js";
import { productionMetadataSchema, repoAssetPathSchema } from "./manifest-shared.js";
import { avatarManifestSchemaVersion } from "./schema-versions.js";

const avatarDisplayAssetsSchema = z
  .object({
    bodyLod0: repoAssetPathSchema,
    bodyLod1: repoAssetPathSchema,
    bodyLod2: repoAssetPathSchema,
    headLod0: repoAssetPathSchema,
    hairLod0: repoAssetPathSchema,
    hairLod1: repoAssetPathSchema,
  })
  .strict();

const avatarFitAssetsSchema = z
  .object({
    fitBody: repoAssetPathSchema,
    measurementLandmarks: repoAssetPathSchema,
    bodySignatureModel: repoAssetPathSchema,
  })
  .strict();

const avatarCollisionAssetsSchema = z
  .object({
    capsules: repoAssetPathSchema,
    collisionMesh: repoAssetPathSchema,
    collisionSdf: repoAssetPathSchema,
  })
  .strict();

const avatarRigAssetsSchema = z
  .object({
    skeleton: repoAssetPathSchema,
    skinningProfile: repoAssetPathSchema,
    morphTargets: repoAssetPathSchema,
  })
  .strict();

const avatarMaterialAssetsSchema = z
  .object({
    skin: repoAssetPathSchema,
    hair: repoAssetPathSchema,
  })
  .strict();

const avatarTextureAssetsSchema = z
  .object({
    skinBaseColor: repoAssetPathSchema,
    skinNormal: repoAssetPathSchema,
    skinRoughness: repoAssetPathSchema,
    hairBaseColor: repoAssetPathSchema,
    hairNormal: repoAssetPathSchema,
  })
  .strict();

const avatarQualityAssetsSchema = z
  .object({
    visualReport: repoAssetPathSchema,
    fitCompatibilityReport: repoAssetPathSchema,
    budgetReport: repoAssetPathSchema,
  })
  .strict();

export const avatarManifestSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    schemaVersion: z.literal(avatarManifestSchemaVersion),
    production: productionMetadataSchema,
    display: avatarDisplayAssetsSchema,
    fit: avatarFitAssetsSchema,
    collision: avatarCollisionAssetsSchema,
    rig: avatarRigAssetsSchema,
    materials: avatarMaterialAssetsSchema,
    textures: avatarTextureAssetsSchema,
    quality: avatarQualityAssetsSchema,
    qualitySummary: assetQualityReportSchema.optional(),
  })
  .strict();

export type AvatarManifest = z.infer<typeof avatarManifestSchema>;

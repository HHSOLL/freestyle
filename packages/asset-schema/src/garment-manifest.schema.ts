import { z } from "zod";
import { assetQualityReportSchema, garmentFitPolicyCategorySchema } from "./quality.js";
import { productionMetadataSchema, repoAssetPathSchema } from "./manifest-shared.js";
import { garmentManifestSchemaVersion } from "./schema-versions.js";

const garmentDisplayAssetsSchema = z
  .object({
    lod0: repoAssetPathSchema,
    lod1: repoAssetPathSchema,
    lod2: repoAssetPathSchema,
  })
  .strict();

const garmentFitAssetsSchema = z
  .object({
    fitMesh: repoAssetPathSchema,
    panelGroups: repoAssetPathSchema,
    seamGraph: repoAssetPathSchema,
    anchors: repoAssetPathSchema,
    constraints: repoAssetPathSchema,
    sizeMapping: repoAssetPathSchema,
    bodyMaskPolicy: repoAssetPathSchema,
    collisionPolicy: repoAssetPathSchema,
  })
  .strict();

const garmentMaterialAssetsSchema = z
  .object({
    visualMaterial: repoAssetPathSchema,
    physicalMaterial: repoAssetPathSchema,
  })
  .strict();

const garmentTextureAssetsSchema = z
  .object({
    baseColor: repoAssetPathSchema,
    normal: repoAssetPathSchema,
    orm: repoAssetPathSchema,
    detailNormal: repoAssetPathSchema.optional(),
  })
  .strict();

const garmentQualityAssetsSchema = z
  .object({
    topologyReport: repoAssetPathSchema,
    materialReport: repoAssetPathSchema,
    fitReport: repoAssetPathSchema,
    visualReport: repoAssetPathSchema,
    performanceReport: repoAssetPathSchema,
    goldenFitResult: repoAssetPathSchema,
  })
  .strict();

export const garmentManifestSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    schemaVersion: z.literal(garmentManifestSchemaVersion),
    production: productionMetadataSchema,
    fitPolicyCategory: garmentFitPolicyCategorySchema,
    display: garmentDisplayAssetsSchema,
    fit: garmentFitAssetsSchema,
    material: garmentMaterialAssetsSchema,
    textures: garmentTextureAssetsSchema,
    quality: garmentQualityAssetsSchema,
    qualitySummary: assetQualityReportSchema.optional(),
  })
  .strict();

export type GarmentManifest = z.infer<typeof garmentManifestSchema>;

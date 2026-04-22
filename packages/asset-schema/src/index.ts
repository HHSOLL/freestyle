import { z } from "zod";
import {
  assetApprovalStateSchema,
  type AssetApprovalState,
} from "./approval-state.js";
import {
  assetBudgetSchema,
  assetQualityReportSchema,
  bodyRegionIdSchema,
  bodySignatureSchema,
  fitMetricsJsonSchema,
  garmentFitPolicyCategorySchema,
  materialClassSchema,
  type BodySignature,
} from "./quality.js";

export * from "./approval-state.js";
export * from "./quality.js";

const repoAssetPathSchema = z.string().trim().min(1).max(512);

const productionMetadataSchema = z
  .object({
    approvalState: assetApprovalStateSchema.default("DRAFT"),
    reviewNotes: z.array(z.string().trim().min(1)).default([]),
    approvedAt: z.iso.datetime().optional(),
    approvedBy: z.string().trim().min(1).max(160).optional(),
    certificationNotes: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

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
    schemaVersion: z.literal("avatar-manifest.v1"),
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
    schemaVersion: z.literal("garment-manifest.v1"),
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

export const materialContractSchema = z
  .object({
    schemaVersion: z.literal("material-contract.v1"),
    materialClass: materialClassSchema,
    visual: z
      .object({
        baseColor: repoAssetPathSchema,
        normal: repoAssetPathSchema.optional(),
        orm: repoAssetPathSchema.optional(),
        detailNormal: repoAssetPathSchema.optional(),
        opacity: repoAssetPathSchema.optional(),
        sheen: z.number().min(0).max(1).optional(),
        clearcoat: z.number().min(0).max(1).optional(),
        anisotropy: z.number().min(0).max(1).optional(),
      })
      .strict(),
    physical: z
      .object({
        thicknessMm: z.number().positive(),
        stretchWarp: z.number().nonnegative(),
        stretchWeft: z.number().nonnegative(),
        bendStiffness: z.number().nonnegative(),
        shearStiffness: z.number().nonnegative(),
        damping: z.number().nonnegative(),
        friction: z.number().nonnegative(),
        densityGsm: z.number().positive().optional(),
      })
      .strict(),
  })
  .strict();

export const fitArtifactManifestSchema = z
  .object({
    schemaVersion: z.literal("fit-artifact.v1"),
    production: productionMetadataSchema,
    bodySignature: bodySignatureSchema,
    bodyRegionTaxonomy: z.array(bodyRegionIdSchema).min(1),
    metrics: fitMetricsJsonSchema,
    budgets: assetBudgetSchema.optional(),
    artifacts: z
      .object({
        drapedGlb: repoAssetPathSchema,
        fitMapJson: repoAssetPathSchema,
        metricsJson: repoAssetPathSchema,
        previewPng: repoAssetPathSchema,
        deformationCache: repoAssetPathSchema,
      })
      .strict(),
  })
  .strict();

export type AvatarManifest = z.infer<typeof avatarManifestSchema>;
export type FitArtifactManifest = z.infer<typeof fitArtifactManifestSchema>;
export type GarmentManifest = z.infer<typeof garmentManifestSchema>;
export type MaterialContract = z.infer<typeof materialContractSchema>;
export type ProductionMetadata = z.infer<typeof productionMetadataSchema>;
export type { AssetApprovalState, BodySignature };

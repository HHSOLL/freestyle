import { z } from "zod";
import {
  assetBudgetSchema,
  assetQualityGateSchema,
  bodyRegionIdSchema,
  bodySignatureSchema,
  fitMetricsJsonSchema,
} from "./quality.js";
import { productionMetadataSchema, repoAssetPathSchema } from "./manifest-shared.js";
import { fitArtifactManifestSchemaVersion } from "./schema-versions.js";

export const fitArtifactManifestSchema = z
  .object({
    schemaVersion: z.literal(fitArtifactManifestSchemaVersion),
    production: productionMetadataSchema,
    bodySignature: bodySignatureSchema,
    bodyRegionTaxonomy: z.array(bodyRegionIdSchema).min(1),
    gates: z.array(assetQualityGateSchema).default([]),
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

export type FitArtifactManifest = z.infer<typeof fitArtifactManifestSchema>;

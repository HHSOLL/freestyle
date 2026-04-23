import { z } from "zod";
import { materialClassSchema } from "./quality.js";
import { repoAssetPathSchema } from "./manifest-shared.js";
import { materialContractSchemaVersion } from "./schema-versions.js";

export const materialContractSchema = z
  .object({
    schemaVersion: z.literal(materialContractSchemaVersion),
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

export type MaterialContract = z.infer<typeof materialContractSchema>;

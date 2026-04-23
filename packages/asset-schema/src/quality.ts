import { z } from "zod";
import { assetApprovalStateSchema } from "./approval-state.js";

export const bodyRegionIds = [
  "head",
  "neck",
  "shoulder_left",
  "shoulder_right",
  "chest",
  "bust",
  "under_bust",
  "upper_back",
  "waist",
  "abdomen",
  "hip",
  "pelvis",
  "upper_arm_left",
  "upper_arm_right",
  "forearm_left",
  "forearm_right",
  "wrist_left",
  "wrist_right",
  "thigh_left",
  "thigh_right",
  "knee_left",
  "knee_right",
  "calf_left",
  "calf_right",
  "ankle_left",
  "ankle_right",
  "foot_left",
  "foot_right",
  "toe_left",
  "toe_right",
  "heel_left",
  "heel_right",
] as const;

export const bodyRegionIdSchema = z.enum(bodyRegionIds);

export const materialClasses = [
  "skin",
  "hair",
  "cotton",
  "denim",
  "leather",
  "rubber",
  "knit",
  "silk",
  "synthetic",
  "metal",
  "plastic",
] as const;

export const materialClassSchema = z.enum(materialClasses);

export const garmentFitPolicyCategories = [
  "tight_top",
  "loose_top",
  "sleeveless_top",
  "pants",
  "skirt_or_shorts",
  "dress",
  "shoes",
  "sandals",
  "boots",
  "accessories",
] as const;

export const garmentFitPolicyCategorySchema = z.enum(garmentFitPolicyCategories);

const stableComparableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stableComparableValue(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableComparableValue(entry)]),
  );
};

const stableHashBase36 = (value: string) => {
  let left = 0xdeadbeef;
  let right = 0x41c6ce57;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 2654435761);
    right = Math.imul(right ^ code, 1597334677);
  }

  left = Math.imul(left ^ (left >>> 16), 2246822507) ^ Math.imul(right ^ (right >>> 13), 3266489909);
  right = Math.imul(right ^ (right >>> 16), 2246822507) ^ Math.imul(left ^ (left >>> 13), 3266489909);

  return (4294967296 * (2097151 & right) + (left >>> 0)).toString(36);
};

export const bodySignatureMeasurementSchema = z
  .object({
    heightCm: z.number().positive(),
    weightKg: z.number().positive().optional(),
    bustCm: z.number().positive().optional(),
    underBustCm: z.number().positive().optional(),
    waistCm: z.number().positive(),
    highHipCm: z.number().positive().optional(),
    hipCm: z.number().positive(),
    shoulderWidthCm: z.number().positive().optional(),
    armLengthCm: z.number().positive().optional(),
    inseamCm: z.number().positive().optional(),
    thighCm: z.number().positive().optional(),
    calfCm: z.number().positive().optional(),
    footLengthCm: z.number().positive().optional(),
    footWidthCm: z.number().positive().optional(),
    instepHeightCm: z.number().positive().optional(),
  })
  .strict();

export const bodySignatureNormalizedShapeSchema = z
  .object({
    heightClass: z.enum(["short", "average", "tall"]),
    torsoClass: z.enum(["short", "average", "long"]),
    hipClass: z.enum(["narrow", "average", "wide"]),
    shoulderClass: z.enum(["narrow", "average", "wide"]),
    footClass: z.enum(["narrow", "average", "wide"]).optional(),
  })
  .strict();

export const bodySignatureSchema = z
  .object({
    version: z.string().trim().min(1).max(64),
    measurements: bodySignatureMeasurementSchema,
    normalizedShape: bodySignatureNormalizedShapeSchema,
    hash: z.string().trim().min(1).max(128),
  })
  .strict();

export type BodySignature = z.infer<typeof bodySignatureSchema>;

export const buildBodySignatureHash = (
  input: Omit<BodySignature, "hash"> | Pick<BodySignature, "version" | "measurements" | "normalizedShape">,
) => {
  return stableHashBase36(
    JSON.stringify(
      stableComparableValue({
        version: input.version,
        measurements: input.measurements,
        normalizedShape: input.normalizedShape,
      }),
    ),
  );
};

export const ensureBodySignatureHash = (
  input: Omit<BodySignature, "hash"> | BodySignature,
): BodySignature => {
  const next = {
    version: input.version,
    measurements: input.measurements,
    normalizedShape: input.normalizedShape,
    hash:
      "hash" in input && typeof input.hash === "string" && input.hash.trim().length > 0
        ? input.hash
        : buildBodySignatureHash(input),
  };

  return bodySignatureSchema.parse(next);
};

const regionPenetrationSchema = z
  .object({
    maxDepthMm: z.number().nonnegative(),
    p95DepthMm: z.number().nonnegative(),
    vertexCount: z.number().int().nonnegative(),
    visibleVertexCount: z.number().int().nonnegative(),
    areaCm2: z.number().nonnegative(),
  })
  .strict();

const regionClearanceSchema = z
  .object({
    meanMm: z.number().nonnegative(),
    p05Mm: z.number().nonnegative(),
    p50Mm: z.number().nonnegative(),
    p95Mm: z.number().nonnegative(),
  })
  .strict();

export const fitMetricsJsonSchema = z
  .object({
    version: z.string().trim().min(1).max(64),
    subject: z
      .object({
        avatarId: z.string().trim().min(1).max(160),
        bodySignatureHash: z.string().trim().min(1).max(128),
        poseFamily: z.string().trim().min(1).max(120),
        garmentId: z.string().trim().min(1).max(160),
        garmentVersion: z.string().trim().min(1).max(120),
        size: z.string().trim().min(1).max(64),
        solverVersion: z.string().trim().min(1).max(120),
      })
      .strict(),
    global: z
      .object({
        fitScore: z.number().min(0).max(100),
        visualFitGrade: z.enum(["A", "B", "C", "D", "F"]),
        pass: z.boolean(),
        failReasons: z.array(z.string().trim().min(1)).default([]),
      })
      .strict(),
    penetration: z
      .object({
        maxDepthMm: z.number().nonnegative(),
        p95DepthMm: z.number().nonnegative(),
        vertexCount: z.number().int().nonnegative(),
        visibleVertexCount: z.number().int().nonnegative(),
        areaCm2: z.number().nonnegative(),
        byRegion: z.record(z.string(), regionPenetrationSchema),
      })
      .strict(),
    clearance: z
      .object({
        meanMm: z.number().nonnegative(),
        p05Mm: z.number().nonnegative(),
        p50Mm: z.number().nonnegative(),
        p95Mm: z.number().nonnegative(),
        byRegion: z.record(z.string(), regionClearanceSchema),
      })
      .strict(),
    floating: z
      .object({
        maxFloatingMm: z.number().nonnegative(),
        p95FloatingMm: z.number().nonnegative(),
        byBoundary: z.record(z.string(), z.number().nonnegative()),
      })
      .strict(),
    bodyMask: z
      .object({
        maskedAreaCm2: z.number().nonnegative(),
        visibleMaskedAreaCm2: z.number().nonnegative(),
        byRegion: z.record(z.string(), z.number().nonnegative()),
      })
      .strict(),
    stability: z
      .object({
        solverIterations: z.number().int().nonnegative(),
        residualError: z.number().nonnegative(),
        hasNaN: z.boolean(),
        selfIntersectionCount: z.number().int().nonnegative(),
        jitterScore: z.number().nonnegative().optional(),
      })
      .strict(),
    performance: z
      .object({
        previewLatencyMs: z.number().nonnegative().optional(),
        hqSolveLatencyMs: z.number().nonnegative().optional(),
        transferLatencyMs: z.number().nonnegative().optional(),
        memoryBytes: z.number().int().nonnegative().optional(),
      })
      .strict(),
  })
  .strict();

export const assetBudgetSchema = z
  .object({
    triangles: z.number().int().nonnegative().optional(),
    drawCalls: z.number().int().nonnegative().optional(),
    gpuTextureBytes: z.number().int().nonnegative().optional(),
    transferBytes: z.number().int().nonnegative().optional(),
  })
  .strict();

export const assetQualityReportSchema = z
  .object({
    approvalState: assetApprovalStateSchema,
    summary: z.string().trim().min(1).max(280),
    issues: z.array(z.string().trim().min(1)).default([]),
    warnings: z.array(z.string().trim().min(1)).default([]),
    budgets: assetBudgetSchema.optional(),
  })
  .strict();

export const assetQualityGateSchema = z
  .object({
    gate: z.string().trim().min(1).max(160),
    status: z.enum(["pass", "warn", "fail"]),
    notes: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const goldenBodyIds = [
  "B01",
  "B02",
  "B03",
  "B04",
  "B05",
  "B06",
  "B07",
  "B08",
  "B09",
  "B10",
  "B11",
  "B12",
] as const;

export const goldenFootIds = ["F01", "F02", "F03", "F04", "F05", "F06"] as const;

export const goldenPoseIds = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"] as const;

export const goldenMatrixSchema = z
  .object({
    bodyIds: z.array(z.enum(goldenBodyIds)).min(1),
    footIds: z.array(z.enum(goldenFootIds)).min(1),
    poseIds: z.array(z.enum(goldenPoseIds)).min(1),
  })
  .strict();

export type AssetQualityReport = z.infer<typeof assetQualityReportSchema>;
export type AssetQualityGate = z.infer<typeof assetQualityGateSchema>;
export type BodyRegionId = z.infer<typeof bodyRegionIdSchema>;
export type FitMetricsJson = z.infer<typeof fitMetricsJsonSchema>;
export type GarmentFitPolicyCategory = z.infer<typeof garmentFitPolicyCategorySchema>;
export type MaterialClass = z.infer<typeof materialClassSchema>;

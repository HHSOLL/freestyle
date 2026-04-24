import { z } from "zod";
import {
  bodyRegionIdSchema,
  fitQualityHardFailThresholds,
  garmentFitPolicyCategorySchema,
} from "./quality.js";

export const garmentAnchorIds = [
  "neckBase",
  "headCenter",
  "foreheadCenter",
  "leftTemple",
  "rightTemple",
  "leftShoulder",
  "rightShoulder",
  "chestCenter",
  "waistCenter",
  "hipCenter",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftFoot",
  "rightFoot",
] as const;

export const garmentAnchorIdSchema = z.enum(garmentAnchorIds);

export const garmentCollisionZones = ["torso", "arms", "hips", "legs", "feet"] as const;

export const garmentCollisionZoneSchema = z.enum(garmentCollisionZones);

export const garmentTransferModes = ["none", "barycentric", "cage"] as const;

export const garmentTransferModeSchema = z.enum(garmentTransferModes);

const uniqueArray = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
  z.array(schema).superRefine((value, context) => {
    const seen = new Set<string>();

    value.forEach((entry, index) => {
      const key = String(entry);
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate value "${key}" is not allowed.`,
          path: [index],
        });
        return;
      }

      seen.add(key);
    });
  });

export const garmentCategoryClearanceTargetSchema = z
  .object({
    minMm: z.number().nonnegative(),
    preferredMm: z.number().nonnegative(),
    maxMm: z.number().nonnegative(),
  })
  .strict()
  .refine(
    (value) => value.minMm <= value.preferredMm && value.preferredMm <= value.maxMm,
    "Clearance targets must satisfy min <= preferred <= max.",
  );

export const garmentCategoryPenetrationThresholdSchema = z
  .object({
    criticalVisibleMaxMm: z.number().nonnegative(),
    nonCriticalVisibleMaxMm: z.number().nonnegative(),
    visibleP95MaxMm: z.number().nonnegative(),
  })
  .strict()
  .refine(
    (value) =>
      value.criticalVisibleMaxMm <= value.nonCriticalVisibleMaxMm &&
      value.visibleP95MaxMm <= value.criticalVisibleMaxMm,
    "Penetration thresholds must keep p95 <= critical <= non-critical.",
  );

export const garmentCategoryAnchorPolicySchema = z
  .object({
    requiredAnchors: uniqueArray(garmentAnchorIdSchema).min(1),
    minAnchorCount: z.number().int().positive(),
    requireWeightNormalized: z.boolean(),
    requireMirroredPairing: z.boolean(),
  })
  .strict()
  .refine(
    (value) => value.requiredAnchors.length >= value.minAnchorCount,
    "requiredAnchors must satisfy minAnchorCount.",
  );

export const garmentCategoryCollisionPolicySchema = z
  .object({
    requiredZones: uniqueArray(garmentCollisionZoneSchema),
    allowedZones: uniqueArray(garmentCollisionZoneSchema).min(1),
    segmentedBodyRequired: z.boolean(),
  })
  .strict()
  .refine(
    (value) => value.requiredZones.every((zone) => value.allowedZones.includes(zone)),
    "requiredZones must be a subset of allowedZones.",
  );

export const garmentCategoryPreviewPolicySchema = z
  .object({
    transferMode: garmentTransferModeSchema,
    deterministic: z.boolean(),
    solverUsesDisplayMesh: z.boolean(),
    supportsPreview: z.boolean(),
  })
  .strict()
  .refine(
    (value) => (value.supportsPreview ? value.transferMode !== "none" : value.transferMode === "none"),
    "Preview transferMode must match supportsPreview.",
  )
  .refine(
    (value) => !value.solverUsesDisplayMesh,
    "Display mesh cannot be used directly as solver input.",
  );

export const garmentCategoryHighQualityPolicySchema = z
  .object({
    transferMode: garmentTransferModeSchema,
    requiresFitMesh: z.boolean(),
    requiresCollisionProxy: z.boolean(),
    requiresGoldenMatrix: z.boolean(),
    requiresBodyMaskAudit: z.boolean(),
  })
  .strict()
  .refine(
    (value) => (value.requiresFitMesh ? value.transferMode !== "none" : true),
    "HQ transfer requires a fit mesh transfer mode.",
  );

export const garmentCategoryPolicySchema = z
  .object({
    category: garmentFitPolicyCategorySchema,
    criticalRegions: uniqueArray(bodyRegionIdSchema).min(1),
    allowedMaskRegions: uniqueArray(bodyRegionIdSchema),
    forbiddenMaskRegions: uniqueArray(bodyRegionIdSchema),
    clearanceTarget: garmentCategoryClearanceTargetSchema,
    penetrationThreshold: garmentCategoryPenetrationThresholdSchema,
    anchorPolicy: garmentCategoryAnchorPolicySchema,
    collisionPolicy: garmentCategoryCollisionPolicySchema,
    previewPolicy: garmentCategoryPreviewPolicySchema,
    highQualityPolicy: garmentCategoryHighQualityPolicySchema,
  })
  .strict()
  .refine(
    (value) => value.allowedMaskRegions.every((region) => !value.forbiddenMaskRegions.includes(region)),
    "allowedMaskRegions and forbiddenMaskRegions must not overlap.",
  );

const basePenetrationThreshold = {
  criticalVisibleMaxMm: fitQualityHardFailThresholds.visibleCriticalPenetrationMaxMm,
  nonCriticalVisibleMaxMm: fitQualityHardFailThresholds.visibleNonCriticalPenetrationMaxMm,
  visibleP95MaxMm: fitQualityHardFailThresholds.visiblePenetrationP95Mm,
} as const;

export const garmentCategoryPolicies = {
  tight_top: garmentCategoryPolicySchema.parse({
    category: "tight_top",
    criticalRegions: ["neck", "shoulder_left", "shoulder_right", "bust", "under_bust", "waist"],
    allowedMaskRegions: ["bust", "under_bust", "upper_back", "waist", "abdomen"],
    forbiddenMaskRegions: ["neck", "shoulder_left", "shoulder_right", "upper_arm_left", "upper_arm_right"],
    clearanceTarget: { minMm: 2, preferredMm: 6, maxMm: 12 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["leftShoulder", "rightShoulder", "chestCenter", "waistCenter"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["torso", "arms"],
      allowedZones: ["torso", "arms"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "barycentric",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "barycentric",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  loose_top: garmentCategoryPolicySchema.parse({
    category: "loose_top",
    criticalRegions: ["shoulder_left", "shoulder_right", "chest", "waist", "upper_back"],
    allowedMaskRegions: ["chest", "upper_back", "waist", "abdomen"],
    forbiddenMaskRegions: ["neck"],
    clearanceTarget: { minMm: 6, preferredMm: 14, maxMm: 28 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["leftShoulder", "rightShoulder", "chestCenter"],
      minAnchorCount: 3,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["torso"],
      allowedZones: ["torso", "arms"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "cage",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "cage",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  sleeveless_top: garmentCategoryPolicySchema.parse({
    category: "sleeveless_top",
    criticalRegions: ["neck", "shoulder_left", "shoulder_right", "chest", "bust", "waist"],
    allowedMaskRegions: ["chest", "bust", "under_bust", "upper_back", "waist"],
    forbiddenMaskRegions: ["neck", "shoulder_left", "shoulder_right", "upper_arm_left", "upper_arm_right"],
    clearanceTarget: { minMm: 2, preferredMm: 7, maxMm: 14 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["leftShoulder", "rightShoulder", "chestCenter"],
      minAnchorCount: 3,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["torso"],
      allowedZones: ["torso", "arms"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "barycentric",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "barycentric",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  pants: garmentCategoryPolicySchema.parse({
    category: "pants",
    criticalRegions: ["waist", "hip", "pelvis", "thigh_left", "thigh_right", "ankle_left", "ankle_right"],
    allowedMaskRegions: ["pelvis", "thigh_left", "thigh_right", "calf_left", "calf_right"],
    forbiddenMaskRegions: ["waist", "ankle_left", "ankle_right"],
    clearanceTarget: { minMm: 3, preferredMm: 8, maxMm: 18 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["waistCenter", "hipCenter", "leftKnee", "rightKnee"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["hips", "legs"],
      allowedZones: ["hips", "legs"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "barycentric",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "barycentric",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  skirt_or_shorts: garmentCategoryPolicySchema.parse({
    category: "skirt_or_shorts",
    criticalRegions: ["waist", "hip", "pelvis", "thigh_left", "thigh_right"],
    allowedMaskRegions: ["pelvis", "hip", "thigh_left", "thigh_right"],
    forbiddenMaskRegions: ["waist"],
    clearanceTarget: { minMm: 4, preferredMm: 10, maxMm: 24 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["waistCenter", "hipCenter"],
      minAnchorCount: 2,
      requireWeightNormalized: true,
      requireMirroredPairing: false,
    },
    collisionPolicy: {
      requiredZones: ["hips"],
      allowedZones: ["hips", "legs"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "cage",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "cage",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  dress: garmentCategoryPolicySchema.parse({
    category: "dress",
    criticalRegions: ["shoulder_left", "shoulder_right", "waist", "hip", "pelvis"],
    allowedMaskRegions: ["bust", "upper_back", "waist", "hip", "pelvis", "thigh_left", "thigh_right"],
    forbiddenMaskRegions: ["neck", "shoulder_left", "shoulder_right"],
    clearanceTarget: { minMm: 4, preferredMm: 10, maxMm: 22 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["leftShoulder", "rightShoulder", "waistCenter", "hipCenter"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["torso", "hips"],
      allowedZones: ["torso", "hips", "legs"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "cage",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "cage",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  shoes: garmentCategoryPolicySchema.parse({
    category: "shoes",
    criticalRegions: ["ankle_left", "ankle_right", "foot_left", "foot_right", "heel_left", "heel_right"],
    allowedMaskRegions: ["foot_left", "foot_right", "toe_left", "toe_right"],
    forbiddenMaskRegions: ["ankle_left", "ankle_right", "heel_left", "heel_right"],
    clearanceTarget: { minMm: 1, preferredMm: 3, maxMm: 8 },
    penetrationThreshold: {
      criticalVisibleMaxMm: 2.5,
      nonCriticalVisibleMaxMm: 4,
      visibleP95MaxMm: 1.5,
    },
    anchorPolicy: {
      requiredAnchors: ["leftAnkle", "rightAnkle", "leftFoot", "rightFoot"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["feet"],
      allowedZones: ["feet"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "barycentric",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "barycentric",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  sandals: garmentCategoryPolicySchema.parse({
    category: "sandals",
    criticalRegions: ["foot_left", "foot_right", "toe_left", "toe_right", "heel_left", "heel_right"],
    allowedMaskRegions: [],
    forbiddenMaskRegions: ["foot_left", "foot_right", "toe_left", "toe_right", "heel_left", "heel_right"],
    clearanceTarget: { minMm: 0, preferredMm: 2, maxMm: 6 },
    penetrationThreshold: {
      criticalVisibleMaxMm: 2,
      nonCriticalVisibleMaxMm: 4,
      visibleP95MaxMm: 1.5,
    },
    anchorPolicy: {
      requiredAnchors: ["leftFoot", "rightFoot", "leftAnkle", "rightAnkle"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["feet"],
      allowedZones: ["feet"],
      segmentedBodyRequired: false,
    },
    previewPolicy: {
      transferMode: "barycentric",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "barycentric",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  boots: garmentCategoryPolicySchema.parse({
    category: "boots",
    criticalRegions: ["ankle_left", "ankle_right", "calf_left", "calf_right", "foot_left", "foot_right"],
    allowedMaskRegions: ["foot_left", "foot_right", "heel_left", "heel_right", "ankle_left", "ankle_right"],
    forbiddenMaskRegions: ["calf_left", "calf_right"],
    clearanceTarget: { minMm: 2, preferredMm: 4, maxMm: 10 },
    penetrationThreshold: {
      criticalVisibleMaxMm: 2.5,
      nonCriticalVisibleMaxMm: 4,
      visibleP95MaxMm: 1.5,
    },
    anchorPolicy: {
      requiredAnchors: ["leftAnkle", "rightAnkle", "leftFoot", "rightFoot"],
      minAnchorCount: 4,
      requireWeightNormalized: true,
      requireMirroredPairing: true,
    },
    collisionPolicy: {
      requiredZones: ["feet", "legs"],
      allowedZones: ["feet", "legs"],
      segmentedBodyRequired: true,
    },
    previewPolicy: {
      transferMode: "cage",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: true,
    },
    highQualityPolicy: {
      transferMode: "cage",
      requiresFitMesh: true,
      requiresCollisionProxy: true,
      requiresGoldenMatrix: true,
      requiresBodyMaskAudit: true,
    },
  }),
  accessories: garmentCategoryPolicySchema.parse({
    category: "accessories",
    criticalRegions: ["head", "neck"],
    allowedMaskRegions: [],
    forbiddenMaskRegions: ["head", "neck"],
    clearanceTarget: { minMm: 1, preferredMm: 3, maxMm: 10 },
    penetrationThreshold: basePenetrationThreshold,
    anchorPolicy: {
      requiredAnchors: ["headCenter"],
      minAnchorCount: 1,
      requireWeightNormalized: true,
      requireMirroredPairing: false,
    },
    collisionPolicy: {
      requiredZones: [],
      allowedZones: ["torso", "arms", "hips", "legs", "feet"],
      segmentedBodyRequired: false,
    },
    previewPolicy: {
      transferMode: "none",
      deterministic: true,
      solverUsesDisplayMesh: false,
      supportsPreview: false,
    },
    highQualityPolicy: {
      transferMode: "none",
      requiresFitMesh: false,
      requiresCollisionProxy: false,
      requiresGoldenMatrix: false,
      requiresBodyMaskAudit: false,
    },
  }),
} as const;

export const resolveGarmentCategoryPolicy = (category: z.infer<typeof garmentFitPolicyCategorySchema>) =>
  garmentCategoryPolicies[category];

export type GarmentAnchorId = z.infer<typeof garmentAnchorIdSchema>;
export type GarmentCategoryAnchorPolicy = z.infer<typeof garmentCategoryAnchorPolicySchema>;
export type GarmentCategoryClearanceTarget = z.infer<typeof garmentCategoryClearanceTargetSchema>;
export type GarmentCategoryCollisionPolicy = z.infer<typeof garmentCategoryCollisionPolicySchema>;
export type GarmentCategoryHighQualityPolicy = z.infer<typeof garmentCategoryHighQualityPolicySchema>;
export type GarmentCategoryPolicy = z.infer<typeof garmentCategoryPolicySchema>;
export type GarmentCategoryPenetrationThreshold = z.infer<typeof garmentCategoryPenetrationThresholdSchema>;
export type GarmentCategoryPreviewPolicy = z.infer<typeof garmentCategoryPreviewPolicySchema>;
export type GarmentCollisionZone = z.infer<typeof garmentCollisionZoneSchema>;
export type GarmentTransferMode = z.infer<typeof garmentTransferModeSchema>;

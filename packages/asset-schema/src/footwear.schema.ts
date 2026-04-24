import { z } from "zod";

export const footwearContractVersion = "footwear-fit-gates.v1" as const;

export const footwearCategories = ["shoes", "sandals", "boots"] as const;

export const footwearCategorySchema = z.enum(footwearCategories);

export const footwearFitMetricIds = [
  "footLengthDeltaMm",
  "footWidthDeltaMm",
  "instepClearanceMm",
  "heelAlignmentDeltaMm",
  "toeAlignmentDeltaMm",
  "outsoleOverhangMm",
  "strapVisiblePenetrationMm",
  "bodyMaskVisibleAreaMm2",
  "soleGroundContactPass",
] as const;

export const footwearFitMetricIdSchema = z.enum(footwearFitMetricIds);

const uniqueMetricArraySchema = z.array(footwearFitMetricIdSchema).superRefine((value, context) => {
  const seen = new Set<string>();

  value.forEach((entry, index) => {
    if (seen.has(entry)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate metric "${entry}" is not allowed.`,
        path: [index],
      });
      return;
    }

    seen.add(entry);
  });
});

export const footwearFitThresholdSchema = z
  .object({
    footLengthDeltaMaxMm: z.number().nonnegative(),
    footWidthDeltaMaxMm: z.number().nonnegative(),
    instepClearanceMinMm: z.number().nonnegative(),
    instepClearanceMaxMm: z.number().nonnegative(),
    heelAlignmentMaxMm: z.number().nonnegative(),
    toeAlignmentMaxMm: z.number().nonnegative(),
    outsoleOverhangMaxMm: z.number().nonnegative(),
    strapVisiblePenetrationMaxMm: z.number().nonnegative().optional(),
    bodyMaskVisibleAreaMaxMm2: z.number().nonnegative(),
    soleGroundContactRequired: z.boolean(),
  })
  .strict()
  .refine(
    (value) => value.instepClearanceMinMm <= value.instepClearanceMaxMm,
    "Instep clearance thresholds must satisfy min <= max.",
  );

export const footwearFitGateContractSchema = z
  .object({
    version: z.literal(footwearContractVersion),
    category: footwearCategorySchema,
    requiredMetrics: uniqueMetricArraySchema.min(1),
    thresholds: footwearFitThresholdSchema,
    notes: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const footwearFitMetricsSchema = z
  .object({
    footLengthDeltaMm: z.number().nonnegative().optional(),
    footWidthDeltaMm: z.number().nonnegative().optional(),
    instepClearanceMm: z.number().nonnegative().optional(),
    heelAlignmentDeltaMm: z.number().nonnegative().optional(),
    toeAlignmentDeltaMm: z.number().nonnegative().optional(),
    outsoleOverhangMm: z.number().nonnegative().optional(),
    strapVisiblePenetrationMm: z.number().nonnegative().optional(),
    bodyMaskVisibleAreaMm2: z.number().nonnegative().optional(),
    soleGroundContactPass: z.boolean().optional(),
  })
  .strict();

export const footwearFitEvaluationInputSchema = z
  .object({
    category: footwearCategorySchema,
    metrics: footwearFitMetricsSchema,
  })
  .strict();

export const footwearFitFailReasonCodeSchema = z.enum([
  "missing-metric",
  "metric-exceeded",
  "metric-out-of-range",
  "boolean-gate-failed",
]);

export const footwearFitFailReasonSchema = z
  .object({
    code: footwearFitFailReasonCodeSchema,
    metric: footwearFitMetricIdSchema,
    message: z.string().trim().min(1),
  })
  .strict();

export const footwearFitGateResultSchema = z
  .object({
    metric: footwearFitMetricIdSchema,
    pass: z.boolean(),
    actual: z.union([z.number().finite(), z.boolean(), z.null()]),
    expected: z.string().trim().min(1),
    failReason: footwearFitFailReasonSchema.optional(),
  })
  .strict()
  .refine(
    (value) => (value.pass ? !value.failReason : Boolean(value.failReason)),
    "Failed gates require a failReason and passed gates must not include one.",
  );

export const footwearFitEvaluationSchema = z
  .object({
    version: z.literal(footwearContractVersion),
    category: footwearCategorySchema,
    pass: z.boolean(),
    failReasons: z.array(footwearFitFailReasonSchema),
    gates: z.array(footwearFitGateResultSchema).min(1),
  })
  .strict();

export const footwearFitGateContracts = {
  shoes: footwearFitGateContractSchema.parse({
    version: footwearContractVersion,
    category: "shoes",
    requiredMetrics: [
      "footLengthDeltaMm",
      "footWidthDeltaMm",
      "instepClearanceMm",
      "heelAlignmentDeltaMm",
      "toeAlignmentDeltaMm",
      "outsoleOverhangMm",
      "bodyMaskVisibleAreaMm2",
      "soleGroundContactPass",
    ],
    thresholds: {
      footLengthDeltaMaxMm: 8,
      footWidthDeltaMaxMm: 6,
      instepClearanceMinMm: 1,
      instepClearanceMaxMm: 12,
      heelAlignmentMaxMm: 5,
      toeAlignmentMaxMm: 5,
      outsoleOverhangMaxMm: 4,
      bodyMaskVisibleAreaMaxMm2: 120,
      soleGroundContactRequired: true,
    },
    notes: [
      "Closed footwear may hide internal foot geometry but visible mask leakage must stay bounded.",
      "Ground contact is required because floating soles read as a fit failure.",
    ],
  }),
  sandals: footwearFitGateContractSchema.parse({
    version: footwearContractVersion,
    category: "sandals",
    requiredMetrics: [
      "footLengthDeltaMm",
      "footWidthDeltaMm",
      "instepClearanceMm",
      "heelAlignmentDeltaMm",
      "toeAlignmentDeltaMm",
      "outsoleOverhangMm",
      "strapVisiblePenetrationMm",
      "bodyMaskVisibleAreaMm2",
      "soleGroundContactPass",
    ],
    thresholds: {
      footLengthDeltaMaxMm: 6,
      footWidthDeltaMaxMm: 6,
      instepClearanceMinMm: 0,
      instepClearanceMaxMm: 10,
      heelAlignmentMaxMm: 4,
      toeAlignmentMaxMm: 4,
      outsoleOverhangMaxMm: 3,
      strapVisiblePenetrationMaxMm: 2,
      bodyMaskVisibleAreaMaxMm2: 0,
      soleGroundContactRequired: true,
    },
    notes: [
      "Sandals cannot rely on visible foot masking.",
      "Visible strap penetration must stay within 2mm.",
      "Toe and heel alignment must stay within 4mm.",
    ],
  }),
  boots: footwearFitGateContractSchema.parse({
    version: footwearContractVersion,
    category: "boots",
    requiredMetrics: [
      "footLengthDeltaMm",
      "footWidthDeltaMm",
      "instepClearanceMm",
      "heelAlignmentDeltaMm",
      "toeAlignmentDeltaMm",
      "outsoleOverhangMm",
      "bodyMaskVisibleAreaMm2",
      "soleGroundContactPass",
    ],
    thresholds: {
      footLengthDeltaMaxMm: 8,
      footWidthDeltaMaxMm: 7,
      instepClearanceMinMm: 1,
      instepClearanceMaxMm: 14,
      heelAlignmentMaxMm: 5,
      toeAlignmentMaxMm: 5,
      outsoleOverhangMaxMm: 4,
      bodyMaskVisibleAreaMaxMm2: 40,
      soleGroundContactRequired: true,
    },
    notes: [
      "Boot shafts may occlude part of the ankle, but visible foot mask leakage still fails when it escapes the silhouette.",
    ],
  }),
} as const;

export const resolveFootwearFitGateContract = (category: z.infer<typeof footwearCategorySchema>) =>
  footwearFitGateContracts[category];

export type FootwearCategory = z.infer<typeof footwearCategorySchema>;
export type FootwearFitEvaluation = z.infer<typeof footwearFitEvaluationSchema>;
export type FootwearFitEvaluationInput = z.infer<typeof footwearFitEvaluationInputSchema>;
export type FootwearFitFailReason = z.infer<typeof footwearFitFailReasonSchema>;
export type FootwearFitFailReasonCode = z.infer<typeof footwearFitFailReasonCodeSchema>;
export type FootwearFitGateContract = z.infer<typeof footwearFitGateContractSchema>;
export type FootwearFitGateResult = z.infer<typeof footwearFitGateResultSchema>;
export type FootwearFitMetricId = z.infer<typeof footwearFitMetricIdSchema>;
export type FootwearFitMetrics = z.infer<typeof footwearFitMetricsSchema>;

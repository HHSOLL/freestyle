import { z } from "zod";
import { normalizeBodyProfile } from "./domain-types.js";
export type {
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
  FlattenedBodyProfile,
  GarmentPublicationRecord,
  GarmentFitProfile,
  GarmentMeasurementMode,
  GarmentMeasurementModeMap,
  GarmentMeasurements,
  GarmentPhysicalProfile,
  GarmentProfile,
  PublishedGarmentAsset,
  RuntimeGarmentAsset,
  GarmentSizeSpec,
} from "./domain-types.js";
export {
  bodyProfileDetailedKeys,
  bodyProfileSimpleKeys,
  defaultBodyProfile,
  defaultBodyProfileDetailed,
  defaultBodyProfileSimple,
  flattenBodyProfile,
  getBodyMeasurement,
  isBodyProfile,
  isLegacyBodyProfileFlat,
  normalizeBodyProfile,
  setDetailedBodyMeasurement,
  setSimpleBodyMeasurement,
} from "./domain-types.js";

export const widgetErrorCodeSchema = z.enum([
  "WIDGET_CONFIG_NOT_FOUND",
  "WIDGET_ORIGIN_DENIED",
  "WIDGET_EVENT_INVALID",
  "WIDGET_EVENT_RATE_LIMITED",
  "WIDGET_MOUNT_FAILED",
  "WIDGET_ASSET_LOAD_FAILED",
]);

export type WidgetErrorCode = z.infer<typeof widgetErrorCodeSchema>;

export const widgetErrorCodes = widgetErrorCodeSchema.options;

export const widgetConfigQuerySchema = z
  .object({
    tenant_id: z.string().trim().min(1).max(120),
    product_id: z.string().trim().min(1).max(120),
    widget_id: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const widgetThemeSchema = z
  .object({
    mode: z.enum(["light", "dark", "auto"]).default("auto"),
    accent: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#D1B278"),
  })
  .strict();

export const widgetRateLimitSchema = z
  .object({
    max_events: z.number().int().positive(),
    window_seconds: z.number().int().positive(),
  })
  .strict();

export const widgetVersionPolicySchema = z.enum(["immutable", "mutable"]);

export const widgetConfigSchema = z
  .object({
    widget_id: z.string().trim().min(1).max(120),
    tenant_id: z.string().trim().min(1).max(120),
    product_id: z.string().trim().min(1).max(120),
    api_base_url: z.url(),
    events_endpoint: z.string().trim().min(1),
    script_url: z.url(),
    script_integrity: z.string().trim().min(1).optional(),
    stylesheet_url: z.url(),
    stylesheet_integrity: z.string().trim().min(1).optional(),
    asset_base_url: z.url(),
    widget_version_policy: widgetVersionPolicySchema,
    allowed_origins: z.array(z.string().trim().min(1)).default([]),
    feature_flags: z.record(z.string(), z.boolean()).default({}),
    theme: widgetThemeSchema,
    expires_at: z.iso.datetime(),
    dedupe_window_seconds: z.number().int().positive(),
    partial_accept: z.literal(true),
    rate_limit: widgetRateLimitSchema,
    error_codes: z.array(widgetErrorCodeSchema).min(1),
  })
  .strict();

const widgetRecordSchema = z.record(z.string(), z.unknown());

export const widgetIframeMessageSchema = z
  .object({
    type: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(32),
    eventId: z.string().trim().min(1).max(128),
    payload: widgetRecordSchema,
  })
  .strict();

export const widgetEventInputSchema = z
  .object({
    event_id: z.string().trim().min(1).max(128),
    event_name: z.string().trim().min(1).max(120),
    tenant_id: z.string().trim().min(1).max(120),
    product_id: z.string().trim().min(1).max(120),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
    widget_id: z.string().trim().min(1).max(120).optional(),
    session_id: z.string().trim().min(1).max(128).optional(),
    anonymous_id: z.string().trim().min(1).max(128).optional(),
    occurred_at: z.iso.datetime().optional(),
    page_url: z.url().optional(),
    referrer: z.url().optional(),
    context: widgetRecordSchema.optional(),
    payload: widgetRecordSchema.optional(),
  })
  .strict();

export const widgetEventsEnvelopeSchema = z
  .object({
    tenant_id: z.string().trim().min(1).max(120),
    product_id: z.string().trim().min(1).max(120),
    events: z.array(z.unknown()).min(1).max(50),
  })
  .strict();

export const widgetAcceptedEventSchema = z
  .object({
    event_id: z.string().trim().min(1).max(128),
    status: z.enum(["accepted", "duplicate"]),
  })
  .strict();

export const widgetRejectedEventSchema = z
  .object({
    event_id: z.string().trim().min(1).max(128).nullable(),
    code: z.enum(["WIDGET_EVENT_INVALID"]),
    message: z.string().trim().min(1),
  })
  .strict();

export const widgetEventsResponseSchema = z
  .object({
    request_id: z.string().trim().min(1),
    received_count: z.number().int().nonnegative(),
    accepted_count: z.number().int().nonnegative(),
    duplicate_count: z.number().int().nonnegative(),
    rejected_count: z.number().int().nonnegative(),
    accepted: z.array(widgetAcceptedEventSchema),
    rejected: z.array(widgetRejectedEventSchema),
  })
  .strict();

export const widgetErrorResponseSchema = z
  .object({
    error: widgetErrorCodeSchema,
    message: z.string().trim().min(1),
  })
  .strict();

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const jobPayloadEnvelopeSchema = z
  .object({
    schema_version: z.literal("job-payload.v1"),
    job_type: z.string().trim().min(1).max(120),
    trace_id: z.uuid(),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
    data: unknownRecordSchema,
  })
  .strict();

export const jobArtifactSchema = z
  .object({
    kind: z.string().trim().min(1).max(120),
    url: z.url().optional(),
    key: z.string().trim().min(1).max(256).optional(),
    label: z.string().trim().min(1).max(120).optional(),
    metadata: unknownRecordSchema.optional(),
  })
  .strict();

export const jobResultEnvelopeSchema = z
  .object({
    schema_version: z.literal("job-result.v1"),
    job_type: z.string().trim().min(1).max(120),
    trace_id: z.uuid(),
    progress: z.number().min(0).max(100).optional(),
    artifacts: z.array(jobArtifactSchema).default([]),
    metrics: unknownRecordSchema.default({}),
    warnings: z.array(z.string().trim().min(1)).default([]),
    data: unknownRecordSchema.default({}),
  })
  .strict();

export const jobStatusErrorSchema = z
  .object({
    code: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1),
  })
  .strict();

export const jobStatusResponseSchema = z
  .object({
    id: z.uuid(),
    job_type: z.string().trim().min(1).max(120),
    status: z.enum(["queued", "processing", "succeeded", "failed", "cancelled"]),
    trace_id: z.uuid().nullable(),
    progress: z.number().min(0).max(100).optional(),
    result: jobResultEnvelopeSchema.nullable(),
    error: jobStatusErrorSchema.nullable(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
    completed_at: z.iso.datetime().nullable(),
  })
  .strict();

export const measurementCmSchema = z.number().min(0).max(400);

export const avatarGenderSchema = z.enum(["female", "male", "neutral"]);
export const bodyFrameSchema = z.enum(["balanced", "athletic", "soft", "curvy"]);

export const bodyProfileSimpleSchema = z
  .object({
    heightCm: measurementCmSchema,
    shoulderCm: measurementCmSchema,
    chestCm: measurementCmSchema,
    waistCm: measurementCmSchema,
    hipCm: measurementCmSchema,
    inseamCm: measurementCmSchema,
  })
  .strict();

export const bodyProfileDetailedSchema = z
  .object({
    headCircumferenceCm: measurementCmSchema.optional(),
    neckCm: measurementCmSchema.optional(),
    torsoLengthCm: measurementCmSchema.optional(),
    armLengthCm: measurementCmSchema.optional(),
    sleeveLengthCm: measurementCmSchema.optional(),
    bicepCm: measurementCmSchema.optional(),
    forearmCm: measurementCmSchema.optional(),
    wristCm: measurementCmSchema.optional(),
    riseCm: measurementCmSchema.optional(),
    outseamCm: measurementCmSchema.optional(),
    thighCm: measurementCmSchema.optional(),
    kneeCm: measurementCmSchema.optional(),
    calfCm: measurementCmSchema.optional(),
    ankleCm: measurementCmSchema.optional(),
  })
  .strict();

export const legacyBodyProfileFlatSchema = bodyProfileSimpleSchema
  .extend({
    headCircumferenceCm: measurementCmSchema.optional(),
    neckCm: measurementCmSchema.optional(),
    torsoLengthCm: measurementCmSchema.optional(),
    armLengthCm: measurementCmSchema.optional(),
    sleeveLengthCm: measurementCmSchema.optional(),
    bicepCm: measurementCmSchema.optional(),
    forearmCm: measurementCmSchema.optional(),
    wristCm: measurementCmSchema.optional(),
    riseCm: measurementCmSchema.optional(),
    outseamCm: measurementCmSchema.optional(),
    thighCm: measurementCmSchema.optional(),
    kneeCm: measurementCmSchema.optional(),
    calfCm: measurementCmSchema.optional(),
    ankleCm: measurementCmSchema.optional(),
  })
  .strict();

export const bodyProfileSchema = z
  .object({
    version: z.literal(2).optional(),
    gender: avatarGenderSchema.optional(),
    bodyFrame: bodyFrameSchema.optional(),
    simple: bodyProfileSimpleSchema,
    detailed: bodyProfileDetailedSchema.optional(),
  })
  .strict();

export const bodyProfileInputSchema = z.union([bodyProfileSchema, legacyBodyProfileFlatSchema]).transform((profile) =>
  normalizeBodyProfile(profile),
);

export const avatarRenderVariantIdSchema = z.enum(["female-base", "male-base"]);
export const avatarPoseIdSchema = z.enum(["neutral", "relaxed", "contrapposto", "stride", "tailored"]);
export const qualityTierSchema = z.enum(["low", "balanced", "high"]);
export const avatarMeasurementsSidecarSchemaVersion = "avatar-measurements-sidecar-v1";
export const avatarMeasurementsDerivationMethodSchema = z.enum([
  "object-bounding-box-height",
  "bone-head-distance",
  "bone-chain-length",
]);

export const avatarMeasurementDerivationEntrySchema = z
  .object({
    method: avatarMeasurementsDerivationMethodSchema,
    bones: z.array(z.string().trim().min(1)).optional(),
    objectName: z.string().trim().min(1).optional(),
  })
  .strict();

export const avatarReferenceMeasurementsSchema = z
  .object({
    statureMm: z.number().finite().positive(),
    shoulderWidthMm: z.number().finite().positive(),
    armLengthMm: z.number().finite().positive(),
    inseamMm: z.number().finite().positive(),
    torsoLengthMm: z.number().finite().positive(),
    hipWidthMm: z.number().finite().positive(),
  })
  .strict();

export const avatarMeasurementsDerivationSchema = z
  .object({
    kind: z.literal("geometry-derived-reference"),
    intendedUse: z.literal("authoring-qa"),
    sourceObjectName: z.string().trim().min(1),
    sourceRigName: z.string().trim().min(1),
    measurements: z
      .object({
        statureMm: avatarMeasurementDerivationEntrySchema,
        shoulderWidthMm: avatarMeasurementDerivationEntrySchema,
        armLengthMm: avatarMeasurementDerivationEntrySchema,
        inseamMm: avatarMeasurementDerivationEntrySchema,
        torsoLengthMm: avatarMeasurementDerivationEntrySchema,
        hipWidthMm: avatarMeasurementDerivationEntrySchema,
      })
      .strict(),
  })
  .strict();

export const avatarMeasurementsSidecarSchema = z
  .object({
    schemaVersion: z.literal(avatarMeasurementsSidecarSchemaVersion),
    variantId: avatarRenderVariantIdSchema,
    authoringSource: z.literal("mpfb2"),
    units: z.literal("mm"),
    buildProvenance: unknownRecordSchema,
    referenceMeasurementsMm: avatarReferenceMeasurementsSchema,
    referenceMeasurementsMmDerivation: avatarMeasurementsDerivationSchema,
    segmentationVertexCounts: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

const closetCategorySchema = z.enum([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "hair",
  "custom",
]);

const equippedItemIdsSchema = z
  .object({
    tops: z.string().trim().min(1).optional(),
    bottoms: z.string().trim().min(1).optional(),
    outerwear: z.string().trim().min(1).optional(),
    shoes: z.string().trim().min(1).optional(),
    accessories: z.string().trim().min(1).optional(),
    hair: z.string().trim().min(1).optional(),
    custom: z.string().trim().min(1).optional(),
  })
  .strict();

export const closetSceneStateSchema = z
  .object({
    version: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ]),
    avatarVariantId: avatarRenderVariantIdSchema,
    poseId: avatarPoseIdSchema,
    activeCategory: closetCategorySchema,
    selectedItemId: z.string().trim().min(1).nullable(),
    equippedItemIds: equippedItemIdsSchema,
    qualityTier: qualityTierSchema,
  })
  .strict();

export const canvasItemSchema = z
  .object({
    id: z.string().trim().min(1),
    assetId: z.string().trim().min(1),
    kind: z.enum(["garment", "note"]),
    x: z.number().finite(),
    y: z.number().finite(),
    scale: z.number().finite(),
    rotation: z.number().finite(),
    zIndex: z.number().finite(),
  })
  .strict();

export const canvasCompositionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).max(120),
    stageColor: z.string().trim().min(1).max(64),
    notes: z.string().max(2000).optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    bodyProfile: bodyProfileInputSchema,
    closetState: closetSceneStateSchema,
    items: z.array(canvasItemSchema),
  })
  .strict();

export const canvasCompositionListSchema = z.array(canvasCompositionSchema);

export const assetCategorySchema = z.enum([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "hair",
  "custom",
]);

export const assetSourceSchema = z.enum(["inventory", "upload", "url", "import"]);

const garmentMeasurementKeys = [
  "chestCm",
  "waistCm",
  "hipCm",
  "headCircumferenceCm",
  "frameWidthCm",
  "shoulderCm",
  "sleeveLengthCm",
  "lengthCm",
  "inseamCm",
  "riseCm",
  "hemCm",
] as const;

export const garmentMeasurementKeySchema = z.enum(garmentMeasurementKeys);

export const garmentMeasurementsSchema = z
  .object({
    chestCm: measurementCmSchema.optional(),
    waistCm: measurementCmSchema.optional(),
    hipCm: measurementCmSchema.optional(),
    headCircumferenceCm: measurementCmSchema.optional(),
    frameWidthCm: measurementCmSchema.optional(),
    shoulderCm: measurementCmSchema.optional(),
    sleeveLengthCm: measurementCmSchema.optional(),
    lengthCm: measurementCmSchema.optional(),
    inseamCm: measurementCmSchema.optional(),
    riseCm: measurementCmSchema.optional(),
    hemCm: measurementCmSchema.optional(),
  })
  .strict();

export const garmentMeasurementModeSchema = z.enum([
  "body-circumference",
  "flat-half-circumference",
  "linear-length",
]);

export const garmentMeasurementModeMapSchema = z
  .object({
    chestCm: garmentMeasurementModeSchema.optional(),
    waistCm: garmentMeasurementModeSchema.optional(),
    hipCm: garmentMeasurementModeSchema.optional(),
    headCircumferenceCm: garmentMeasurementModeSchema.optional(),
    frameWidthCm: garmentMeasurementModeSchema.optional(),
    shoulderCm: garmentMeasurementModeSchema.optional(),
    sleeveLengthCm: garmentMeasurementModeSchema.optional(),
    lengthCm: garmentMeasurementModeSchema.optional(),
    inseamCm: garmentMeasurementModeSchema.optional(),
    riseCm: garmentMeasurementModeSchema.optional(),
    hemCm: garmentMeasurementModeSchema.optional(),
  })
  .strict();

export const garmentSizeSpecSchema = z
  .object({
    label: z.string().trim().min(1).max(64),
    measurements: garmentMeasurementsSchema,
    measurementModes: garmentMeasurementModeMapSchema.optional(),
    source: z.enum(["authoring", "product-detail", "estimated"]).optional(),
    notes: z.string().trim().max(280).optional(),
  })
  .strict();

export const garmentPhysicalProfileSchema = z
  .object({
    materialStretchRatio: z.number().min(0).max(1).optional(),
    maxComfortStretchRatio: z.number().min(0).max(1).optional(),
    compressionToleranceCm: garmentMeasurementsSchema.optional(),
    easeBiasCm: garmentMeasurementsSchema.optional(),
  })
  .strict();

export const garmentCorrectiveProfileEntrySchema = z
  .object({
    widthScale: z.number().min(0.85).max(1.2).optional(),
    depthScale: z.number().min(0.85).max(1.2).optional(),
    heightScale: z.number().min(0.85).max(1.2).optional(),
    clearanceBiasCm: z.number().min(-2).max(4).optional(),
    offsetY: z.number().min(-0.2).max(0.2).optional(),
  })
  .strict();

export const garmentCorrectiveProfileSchema = z
  .object({
    compression: garmentCorrectiveProfileEntrySchema.optional(),
    snug: garmentCorrectiveProfileEntrySchema.optional(),
    regular: garmentCorrectiveProfileEntrySchema.optional(),
    relaxed: garmentCorrectiveProfileEntrySchema.optional(),
    oversized: garmentCorrectiveProfileEntrySchema.optional(),
  })
  .strict();

export const garmentFitProfileSchema = z
  .object({
    silhouette: z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
    layer: z.enum(["base", "mid", "outer"]).optional(),
    structure: z.enum(["soft", "balanced", "structured"]).optional(),
    stretch: z.number().min(0).max(1).optional(),
    drape: z.number().min(0).max(1).optional(),
  })
  .strict();

export const garmentFitStateSchema = z.enum([
  "compression",
  "snug",
  "regular",
  "relaxed",
  "oversized",
]);

export const garmentFitRiskSchema = z.enum(["low", "medium", "high"]);

export const garmentFitDimensionAssessmentSchema = z
  .object({
    key: garmentMeasurementKeySchema,
    measurementMode: garmentMeasurementModeSchema,
    garmentCm: z.number().finite().nonnegative(),
    bodyCm: z.number().finite().nonnegative(),
    effectiveGarmentCm: z.number().finite().nonnegative(),
    easeCm: z.number().finite(),
    requiredStretchRatio: z.number().finite().nonnegative(),
    state: garmentFitStateSchema,
  })
  .strict();

export const garmentFitAssessmentSchema = z
  .object({
    sizeLabel: z.string().trim().min(1).max(64).nullable(),
    overallState: garmentFitStateSchema,
    tensionRisk: garmentFitRiskSchema,
    clippingRisk: garmentFitRiskSchema,
    stretchLoad: z.number().finite().nonnegative(),
    limitingKeys: z.array(garmentMeasurementKeySchema).min(1).max(3),
    dimensions: z.array(garmentFitDimensionAssessmentSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const dimensionKeys = new Set(value.dimensions.map((entry) => entry.key));
    value.limitingKeys.forEach((key, index) => {
      if (!dimensionKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["limitingKeys", index],
          message: "limitingKeys entries must exist in dimensions",
        });
      }
    });
  });

export const garmentInstantFitSchemaVersion = "garment-instant-fit-report.v1";

export const garmentFitOverallSchema = z.enum(["good", "tight", "loose", "risky"]);

export const garmentFitRegionIdSchema = z.enum([
  "chest",
  "waist",
  "hip",
  "shoulder",
  "sleeve",
  "length",
  "inseam",
  "rise",
  "hem",
  "head",
  "frame",
]);

const localizedFitCopySchema = z
  .object({
    ko: z.string().trim().min(1).max(240),
    en: z.string().trim().min(1).max(240),
  })
  .strict();

export const garmentInstantFitRegionSchema = z
  .object({
    regionId: garmentFitRegionIdSchema,
    measurementKey: garmentMeasurementKeySchema,
    fitState: garmentFitStateSchema,
    easeCm: z.number().finite(),
    isLimiting: z.boolean(),
  })
  .strict();

export const garmentInstantFitReportSchema = z
  .object({
    schemaVersion: z.literal(garmentInstantFitSchemaVersion),
    sizeLabel: z.string().trim().min(1).max(64).nullable(),
    overallFit: garmentFitOverallSchema,
    overallState: garmentFitStateSchema,
    tensionRisk: garmentFitRiskSchema,
    clippingRisk: garmentFitRiskSchema,
    confidence: z.number().finite().min(0).max(1),
    primaryRegionId: garmentFitRegionIdSchema,
    summary: localizedFitCopySchema,
    explanations: z.array(localizedFitCopySchema).min(1).max(4),
    limitingKeys: z.array(garmentMeasurementKeySchema).min(1).max(3),
    regions: z.array(garmentInstantFitRegionSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const regionIds = new Set(value.regions.map((entry) => entry.regionId));
    if (!regionIds.has(value.primaryRegionId)) {
      context.addIssue({
        code: "custom",
        path: ["primaryRegionId"],
        message: "primaryRegionId must exist in regions",
      });
    }

    const dimensionKeys = new Set(value.regions.map((entry) => entry.measurementKey));
    value.limitingKeys.forEach((key, index) => {
      if (!dimensionKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["limitingKeys", index],
          message: "limitingKeys entries must exist in regions",
        });
      }
    });
  });

export const fitCalibrationComparisonEntrySchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    profileValueMm: z.number().finite().nullable(),
    referenceValueMm: z.number().finite().nullable(),
    deltaMm: z.number().finite().nullable(),
  })
  .strict();

export const fitCalibrationReferenceComparisonSchema = z
  .object({
    statureMm: fitCalibrationComparisonEntrySchema,
    shoulderWidthMm: fitCalibrationComparisonEntrySchema,
    armLengthMm: fitCalibrationComparisonEntrySchema,
    inseamMm: fitCalibrationComparisonEntrySchema,
    torsoLengthMm: fitCalibrationComparisonEntrySchema,
  })
  .strict();

export const avatarCalibrationReferenceSchema = z
  .object({
    variantId: avatarRenderVariantIdSchema,
    expectedGender: avatarGenderSchema,
    sidecarPath: z.string().trim().min(1),
    authoringSource: z.literal("mpfb2"),
    units: z.literal("mm"),
    buildProvenance: unknownRecordSchema,
    referenceMeasurementsMm: avatarReferenceMeasurementsSchema,
    referenceMeasurementsMmDerivation: avatarMeasurementsDerivationSchema,
    archetypeIds: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const fitCalibrationArchetypeSchema = z
  .object({
    id: z.string().trim().min(1),
    avatarVariantId: avatarRenderVariantIdSchema,
    gender: avatarGenderSchema,
    bodyFrame: bodyFrameSchema,
    heightCm: measurementCmSchema,
    calibrationReferencePath: z.string().trim().min(1).nullable(),
    referenceComparisonMm: fitCalibrationReferenceComparisonSchema,
  })
  .strict();

export const fitCalibrationGarmentArchetypeSchema = z
  .object({
    archetypeId: z.string().trim().min(1),
    state: garmentFitStateSchema.nullable(),
    summaryKo: z.string().trim().min(1).nullable(),
    limitingKeys: z.array(garmentMeasurementKeySchema),
    tensionRisk: garmentFitRiskSchema.nullable(),
    clippingRisk: garmentFitRiskSchema.nullable(),
  })
  .strict();

export const fitCalibrationGarmentSchema = z
  .object({
    id: z.string().trim().min(1),
    category: assetCategorySchema,
    archetypes: z.array(fitCalibrationGarmentArchetypeSchema).min(1),
  })
  .strict();

export const fitCalibrationReportSchema = z
  .object({
    schemaVersion: z.literal("fit-calibration-report.v1"),
    generatedAt: z.iso.datetime(),
    avatarCalibrationReferences: z.array(avatarCalibrationReferenceSchema).min(1),
    archetypes: z.array(fitCalibrationArchetypeSchema).min(1),
    garments: z.array(fitCalibrationGarmentSchema).min(1),
  })
  .strict();

export const fitSimulateHQJobType = "fit_simulate_hq_v1";
export const fitSimulateHQSchemaVersion = "fit-simulate-hq.v1";
export const fitMapArtifactSchemaVersion = "fit-map-json.v1";
const fitSimulationOpaqueIdSchema = z.string().trim().min(1).max(160);

export const fitSimulationQualityTierSchema = z.enum(["fast", "balanced", "high"]);

export const fitSimulationArtifactKindSchema = z.enum(["draped_glb", "fit_map_json", "preview_png"]);

export const fitSimulationArtifactSchema = jobArtifactSchema
  .extend({
    kind: fitSimulationArtifactKindSchema,
    url: z.url(),
  })
  .strict();

export const fitSimulateHQJobPayloadSchema = z
  .object({
    bodyVersionId: fitSimulationOpaqueIdSchema,
    garmentVariantId: fitSimulationOpaqueIdSchema,
    avatarManifestUrl: z.url(),
    garmentManifestUrl: z.url(),
    materialPreset: z.string().trim().min(1).max(120),
    qualityTier: fitSimulationQualityTierSchema,
  })
  .strict();

export const fitSimulateHQRequestSchema = fitSimulateHQJobPayloadSchema
  .extend({
    jobType: z.literal(fitSimulateHQJobType),
    schemaVersion: z.literal(fitSimulateHQSchemaVersion),
  })
  .strict();

export const fitSimulateHQJobPayloadInputSchema = z.union([
  fitSimulateHQJobPayloadSchema,
  fitSimulateHQRequestSchema.transform((value) => ({
    bodyVersionId: value.bodyVersionId,
    garmentVariantId: value.garmentVariantId,
    avatarManifestUrl: value.avatarManifestUrl,
    garmentManifestUrl: value.garmentManifestUrl,
    materialPreset: value.materialPreset,
    qualityTier: value.qualityTier,
  })),
]);

export const fitSimulateHQMetricsSchema = z
  .object({
    durationMs: z.number().int().positive(),
    penetrationRate: z.number().finite().min(0).max(1),
    maxStretchRatio: z.number().finite().positive(),
  })
  .strict();

export const fitMapOverlayKindSchema = z.enum([
  "easeMap",
  "stretchMap",
  "collisionRiskMap",
  "confidenceMap",
]);

export const fitMapRegionScoreSchema = z
  .object({
    regionId: garmentFitRegionIdSchema,
    measurementKey: garmentMeasurementKeySchema,
    score: z.number().finite().min(0).max(1),
    fitState: garmentFitStateSchema,
    easeCm: z.number().finite(),
    requiredStretchRatio: z.number().finite().nonnegative(),
    isLimiting: z.boolean(),
  })
  .strict();

export const fitMapOverlaySchema = z
  .object({
    kind: fitMapOverlayKindSchema,
    overallScore: z.number().finite().min(0).max(1),
    maxRegionScore: z.number().finite().min(0).max(1),
    regions: z.array(fitMapRegionScoreSchema).min(1),
  })
  .strict();

export const fitMapArtifactDataSchema = z
  .object({
    schemaVersion: z.literal(fitMapArtifactSchemaVersion),
    generatedAt: z.iso.datetime(),
    fitSimulationId: z.uuid(),
    request: z
      .object({
        bodyVersionId: fitSimulationOpaqueIdSchema,
        garmentVariantId: fitSimulationOpaqueIdSchema,
        avatarVariantId: avatarRenderVariantIdSchema,
        avatarManifestUrl: z.url(),
        garmentManifestUrl: z.url(),
        materialPreset: z.string().trim().min(1).max(120),
        qualityTier: fitSimulationQualityTierSchema,
      })
      .strict(),
    garment: z
      .object({
        id: z.string().trim().min(1).max(160),
        name: z.string().trim().min(1).max(160),
        category: assetCategorySchema,
      })
      .strict(),
    fitAssessment: garmentFitAssessmentSchema,
    instantFit: garmentInstantFitReportSchema.nullable(),
    overlays: z.array(fitMapOverlaySchema).length(4),
    warnings: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const fitSimulateHQResultDataSchema = z
  .object({
    schemaVersion: z.literal(fitSimulateHQSchemaVersion),
    bodyVersionId: fitSimulationOpaqueIdSchema,
    garmentVariantId: fitSimulationOpaqueIdSchema,
    qualityTier: fitSimulationQualityTierSchema,
  })
  .strict();

export const fitSimulateHQResultEnvelopeSchema = jobResultEnvelopeSchema
  .extend({
    job_type: z.literal(fitSimulateHQJobType),
    artifacts: z.array(fitSimulationArtifactSchema).min(1),
    metrics: fitSimulateHQMetricsSchema,
    data: fitSimulateHQResultDataSchema,
  })
  .strict();

export const fitSimulationStatusSchema = z.enum(["queued", "processing", "succeeded", "failed"]);

export const fitSimulationRecordSchema = z
  .object({
    id: z.uuid(),
    jobId: z.uuid().nullable(),
    status: fitSimulationStatusSchema,
    avatarVariantId: avatarRenderVariantIdSchema,
    bodyVersionId: fitSimulationOpaqueIdSchema,
    garmentVariantId: fitSimulationOpaqueIdSchema,
    avatarManifestUrl: z.url(),
    garmentManifestUrl: z.url(),
    materialPreset: z.string().trim().min(1).max(120),
    qualityTier: fitSimulationQualityTierSchema,
    instantFit: garmentInstantFitReportSchema.nullable(),
    fitMap: fitMapArtifactDataSchema.nullable().default(null),
    artifacts: z.array(fitSimulationArtifactSchema).default([]),
    metrics: fitSimulateHQMetricsSchema.nullable(),
    warnings: z.array(z.string().trim().min(1)).default([]),
    errorMessage: z.string().trim().min(1).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
  })
  .strict();

export const fitSimulationCreateResponseSchema = z
  .object({
    job_id: z.uuid(),
    fit_simulation_id: z.uuid(),
  })
  .strict();

export const fitSimulationGetResponseSchema = z
  .object({
    fitSimulation: fitSimulationRecordSchema,
  })
  .strict();

export const assetAuthoringSummarySchemaVersion = "runtime-asset-authoring-summary.v1";
export const garmentPatternSpecSchemaVersion = "garment-pattern-spec.v1";

const repoRelativePathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !value.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(value),
    "expected a repo-relative path",
  );

const authoringSourceSchema = z.literal("mpfb2");
export const garmentAnchorIdSchema = z.enum([
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
]);

export const garmentCollisionZoneSchema = z.enum(["torso", "arms", "hips", "legs", "feet"]);

const garmentFitAuditHotSpotSchema = z
  .object({
    zone: z.string().trim().min(1).max(64),
    countWithin5mm: z.number().int().nonnegative(),
  })
  .strict();

const garmentFitAuditSchema = z
  .object({
    minDistanceMeters: z.number().finite().nonnegative().nullable(),
    penetratingVertexCount: z.number().int().nonnegative(),
    thresholdCounts: z.record(z.string(), z.number().int().nonnegative()),
    hotSpots: z.array(garmentFitAuditHotSpotSchema).default([]),
  })
  .strict();

const garmentAuthoringMeshSummarySchema = z
  .object({
    name: z.string().trim().min(1),
    vertexCount: z.number().int().nonnegative(),
    materialSlots: z.array(z.string().trim().min(1).nullable()),
    vertexGroups: z.array(z.string().trim().min(1)),
  })
  .strict();

const garmentAuthoringArmatureSummarySchema = z
  .object({
    name: z.string().trim().min(1),
    boneNames: z.array(z.string().trim().min(1)),
  })
  .strict();

const garmentAuthoringPresetSchema = z
  .object({
    presetId: avatarRenderVariantIdSchema,
    relativePath: repoRelativePathSchema,
  })
  .strict();

const garmentAuthoringAssetReferenceSchema = z
  .object({
    kind: z.enum(["repo-relative", "mpfb-user-data-fragment"]),
    value: z.string().trim().min(1),
  })
  .strict();

const garmentAuthoringPackStateSchema = z
  .object({
    installed: z.boolean(),
    modern: z.boolean(),
    installedNow: z.boolean(),
    userDataSource: z.literal("blender-extension-user-data"),
  })
  .strict();

const garmentPatternPanelRoleSchema = z.enum([
  "front-body",
  "back-body",
  "left-sleeve",
  "right-sleeve",
  "collar",
  "waistband",
  "left-leg",
  "right-leg",
  "front-upper",
  "heel-counter",
  "tongue",
  "sole",
  "other",
]);

const garmentPatternPanelSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    role: garmentPatternPanelRoleSchema,
    pieceCount: z.number().int().positive().max(12),
    notes: z.string().trim().max(280).optional(),
  })
  .strict();

const garmentPatternSeamConstructionSchema = z.enum([
  "lockstitch",
  "overlock",
  "coverstitch",
  "welt",
  "cemented",
  "joined",
  "other",
]);

const garmentPatternSeamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    construction: garmentPatternSeamConstructionSchema,
    panelIds: z.array(z.string().trim().min(1).max(64)).min(1).max(6),
    notes: z.string().trim().max(280).optional(),
  })
  .strict();

const garmentMaterialPresetSchema = z
  .object({
    presetId: z.string().trim().min(1).max(64),
    fabricFamily: z.enum(["knit", "woven", "synthetic", "leather", "rubber", "blended"]),
    stretchProfile: z.enum(["none", "low", "medium", "high"]),
    thicknessMm: z.number().finite().positive().max(25),
    weightGsm: z.number().finite().positive().max(1500).optional(),
    notes: z.string().trim().max(280).optional(),
  })
  .strict();

export const garmentPatternSpecSchema = z
  .object({
    schemaVersion: z.literal(garmentPatternSpecSchemaVersion),
    intendedUse: z.literal("authoring-only"),
    runtimeStarterId: z.string().trim().min(1).max(120),
    category: assetCategorySchema,
    measurements: garmentMeasurementsSchema,
    measurementModes: garmentMeasurementModeMapSchema,
    sizeChart: z.array(garmentSizeSpecSchema).min(1),
    selectedSizeLabel: z.string().trim().min(1).max(64),
    physicalProfile: garmentPhysicalProfileSchema,
    materialPreset: garmentMaterialPresetSchema,
    anchorIds: z.array(garmentAnchorIdSchema).min(1),
    panels: z.array(garmentPatternPanelSchema).default([]),
    seams: z.array(garmentPatternSeamSchema).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const sizeLabels = new Set(value.sizeChart.map((entry) => entry.label));
    if (!sizeLabels.has(value.selectedSizeLabel)) {
      context.addIssue({
        code: "custom",
        path: ["selectedSizeLabel"],
        message: "selectedSizeLabel must exist in sizeChart",
      });
    }

    const panelIds = new Set(value.panels.map((panel) => panel.id));
    value.seams.forEach((seam, seamIndex) => {
      seam.panelIds.forEach((panelId, panelIndex) => {
        if (!panelIds.has(panelId)) {
          context.addIssue({
            code: "custom",
            path: ["seams", seamIndex, "panelIds", panelIndex],
            message: "seam panelIds must exist in panels",
          });
        }
      });
    });
  });

export type GarmentPatternSpec = z.infer<typeof garmentPatternSpecSchema>;

const garmentPatternSpecReferenceSchema = z
  .object({
    relativePath: repoRelativePathSchema,
  })
  .strict();

const runtimeAuthoringObjectSummarySchema = z
  .object({
    name: z.string().trim().min(1),
    vertices: z.number().int().nonnegative(),
    materials: z.array(z.string().trim().min(1).nullable()),
  })
  .strict();

export const garmentAuthoringSummarySchema = z
  .object({
    schemaVersion: z.literal(assetAuthoringSummarySchemaVersion),
    authoringSource: authoringSourceSchema,
    kind: z.literal("garment"),
    variantId: avatarRenderVariantIdSchema,
    garment: garmentAuthoringMeshSummarySchema,
    fitAudit: garmentFitAuditSchema,
    armature: garmentAuthoringArmatureSummarySchema,
    preset: garmentAuthoringPresetSchema,
    clothesAsset: garmentAuthoringAssetReferenceSchema,
    packState: garmentAuthoringPackStateSchema,
    patternSpec: garmentPatternSpecReferenceSchema.optional(),
    outputBlend: repoRelativePathSchema,
    outputGlb: repoRelativePathSchema,
  })
  .strict();

export const hairAuthoringSummarySchema = z
  .object({
    schemaVersion: z.literal(assetAuthoringSummarySchemaVersion),
    authoringSource: authoringSourceSchema,
    kind: z.literal("hair"),
    variantId: avatarRenderVariantIdSchema,
    hairStyle: z.string().trim().min(1).max(64),
    armature: z.string().trim().min(1),
    objects: z.array(runtimeAuthoringObjectSummarySchema).min(1),
    outputBlend: repoRelativePathSchema,
    outputGlb: repoRelativePathSchema,
  })
  .strict();

export const accessoryAuthoringSummarySchema = z
  .object({
    schemaVersion: z.literal(assetAuthoringSummarySchemaVersion),
    authoringSource: authoringSourceSchema,
    kind: z.literal("accessory"),
    variantId: avatarRenderVariantIdSchema,
    accessoryType: z.string().trim().min(1).max(64),
    armature: z.string().trim().min(1),
    objects: z.array(runtimeAuthoringObjectSummarySchema).min(1),
    outputBlend: repoRelativePathSchema,
    outputGlb: repoRelativePathSchema,
  })
  .strict();

export const runtimeAssetAuthoringSummarySchema = z.discriminatedUnion("kind", [
  garmentAuthoringSummarySchema,
  hairAuthoringSummarySchema,
  accessoryAuthoringSummarySchema,
]);

export const garmentRuntimeBindingSchema = z
  .object({
    modelPath: z.string().trim().min(1),
    modelPathByVariant: z
      .object({
        "female-base": z.string().trim().min(1).optional(),
        "male-base": z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    skeletonProfileId: z.string().trim().min(1),
    anchorBindings: z
      .array(
        z
          .object({
            id: garmentAnchorIdSchema,
            weight: z.number(),
          })
          .strict(),
      )
      .min(1),
    collisionZones: z.array(garmentCollisionZoneSchema),
    bodyMaskZones: z.array(garmentCollisionZoneSchema),
    poseTuning: z
      .object({
        neutral: z
          .object({
            widthScale: z.number().positive().optional(),
            depthScale: z.number().positive().optional(),
            heightScale: z.number().positive().optional(),
            clearanceMultiplier: z.number().positive().optional(),
            offsetY: z.number().optional(),
            extraBodyMaskZones: z.array(garmentCollisionZoneSchema).optional(),
          })
          .strict()
          .optional(),
        relaxed: z
          .object({
            widthScale: z.number().positive().optional(),
            depthScale: z.number().positive().optional(),
            heightScale: z.number().positive().optional(),
            clearanceMultiplier: z.number().positive().optional(),
            offsetY: z.number().optional(),
            extraBodyMaskZones: z.array(garmentCollisionZoneSchema).optional(),
          })
          .strict()
          .optional(),
        contrapposto: z
          .object({
            widthScale: z.number().positive().optional(),
            depthScale: z.number().positive().optional(),
            heightScale: z.number().positive().optional(),
            clearanceMultiplier: z.number().positive().optional(),
            offsetY: z.number().optional(),
            extraBodyMaskZones: z.array(garmentCollisionZoneSchema).optional(),
          })
          .strict()
          .optional(),
        stride: z
          .object({
            widthScale: z.number().positive().optional(),
            depthScale: z.number().positive().optional(),
            heightScale: z.number().positive().optional(),
            clearanceMultiplier: z.number().positive().optional(),
            offsetY: z.number().optional(),
            extraBodyMaskZones: z.array(garmentCollisionZoneSchema).optional(),
          })
          .strict()
          .optional(),
        tailored: z
          .object({
            widthScale: z.number().positive().optional(),
            depthScale: z.number().positive().optional(),
            heightScale: z.number().positive().optional(),
            clearanceMultiplier: z.number().positive().optional(),
            offsetY: z.number().optional(),
            extraBodyMaskZones: z.array(garmentCollisionZoneSchema).optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    secondaryMotion: z
      .object({
        profileId: z.enum(["hair-sway", "hair-long", "hair-bob", "garment-soft", "garment-loose"]),
        stiffness: z.number().positive(),
        damping: z.number().positive(),
        influence: z.number().positive(),
        maxYawDeg: z.number().nonnegative(),
        maxPitchDeg: z.number().nonnegative(),
        maxRollDeg: z.number().nonnegative(),
        idleAmplitudeDeg: z.number().nonnegative().optional(),
        idleFrequencyHz: z.number().positive().optional(),
        verticalBobCm: z.number().nonnegative().optional(),
        lateralSwingCm: z.number().nonnegative().optional(),
      })
      .strict()
      .optional(),
    surfaceClearanceCm: z.number().positive(),
    renderPriority: z.number().int().positive(),
  })
  .strict();

export const garmentPublicationRecordSchema = z
  .object({
    sourceSystem: z.enum(["starter-catalog", "admin-domain", "api-published"]),
    publishedAt: z.iso.datetime(),
    assetVersion: z.string().trim().min(1).max(64),
    measurementStandard: z.literal("body-garment-v1"),
    provenanceUrl: z.url().optional(),
  })
  .strict();

export const garmentProfileSchema = z
  .object({
    version: z.literal(1),
    category: z.string().trim().min(1).max(64),
    image: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    bbox: z
      .object({
        left: z.number().int().nonnegative(),
        top: z.number().int().nonnegative(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    normalizedBounds: z
      .object({
        left: z.number().min(0).max(1),
        top: z.number().min(0).max(1),
        width: z.number().min(0).max(1),
        height: z.number().min(0).max(1),
        centerX: z.number().min(0).max(1),
      })
      .strict(),
    silhouetteSamples: z.array(
      z
        .object({
          yRatio: z.number().min(0).max(1),
          widthRatio: z.number().min(0).max(1),
          centerRatio: z.number().min(0).max(1),
        })
        .strict()
    ),
    coverage: z
      .object({
        topRatio: z.number().min(0).max(1),
        bottomRatio: z.number().min(0).max(1),
        lengthRatio: z.number().min(0).max(1),
      })
      .strict(),
    widthProfile: z
      .object({
        shoulderRatio: z.number().min(0).max(1),
        chestRatio: z.number().min(0).max(1),
        waistRatio: z.number().min(0).max(1),
        hipRatio: z.number().min(0).max(1),
        hemRatio: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict();

export const assetMetadataSchema = z
  .object({
    sourceTitle: z.string().trim().min(1).max(256).optional(),
    sourceBrand: z.string().trim().min(1).max(128).optional(),
    sourceUrl: z.url().optional(),
    originalSize: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    cutout: z
      .object({
        removedBackground: z.boolean().optional(),
        strategy: z.enum(["remote_remove_bg", "embedded_alpha", "local_heuristic"]).optional(),
        fallbackUsed: z.boolean().optional(),
        quality: z.record(z.string(), z.unknown()).optional(),
        trimRect: z
          .object({
            left: z.number().int().nonnegative(),
            top: z.number().int().nonnegative(),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            padding: z.number().int().nonnegative(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    measurements: garmentMeasurementsSchema.optional(),
    measurementModes: garmentMeasurementModeMapSchema.optional(),
    sizeChart: z.array(garmentSizeSpecSchema).min(1).optional(),
    selectedSizeLabel: z.string().trim().min(1).max(64).optional(),
    physicalProfile: garmentPhysicalProfileSchema.optional(),
    correctiveFit: garmentCorrectiveProfileSchema.optional(),
    fitProfile: garmentFitProfileSchema.optional(),
    garmentProfile: garmentProfileSchema.optional(),
    dominantColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })
  .strict();

export const assetSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    imageSrc: z.string().trim().min(1),
    category: assetCategorySchema,
    price: z.number().nonnegative().optional(),
    brand: z.string().trim().min(1).optional(),
    source: assetSourceSchema,
    removedBackground: z.boolean().optional(),
    sourceUrl: z.url().optional(),
    metadata: assetMetadataSchema.optional(),
    garmentProfile: garmentProfileSchema.optional(),
  })
  .strict();

export const runtimeGarmentAssetSchema = assetSchema
  .extend({
    runtime: garmentRuntimeBindingSchema,
    palette: z.array(z.string().trim().min(1)).min(1),
    publication: garmentPublicationRecordSchema.optional(),
  })
  .strict();

export const publishedGarmentAssetSchema = runtimeGarmentAssetSchema
  .extend({
    source: z.enum(["inventory", "import"]),
    publication: garmentPublicationRecordSchema,
  })
  .strict();

export const publishedRuntimeGarmentItemResponseSchema = z
  .object({
    item: publishedGarmentAssetSchema,
  })
  .strict();

export const publishedRuntimeGarmentListResponseSchema = z
  .object({
    items: z.array(publishedGarmentAssetSchema),
    total: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.total !== value.items.length) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: "total must match items.length",
      });
    }
  });

export const closetRuntimeGarmentItemSchema = z
  .object({
    item: publishedGarmentAssetSchema,
    instantFit: garmentInstantFitReportSchema.nullable(),
  })
  .strict();

export const closetRuntimeGarmentItemResponseSchema = z
  .object({
    item: closetRuntimeGarmentItemSchema,
  })
  .strict();

export const closetRuntimeGarmentListResponseSchema = z
  .object({
    items: z.array(closetRuntimeGarmentItemSchema),
    total: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.total !== value.items.length) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: "total must match items.length",
      });
    }
  });

export const assetUpdateInputSchema = z
  .object({
    category: assetCategorySchema.optional(),
    metadata: assetMetadataSchema.optional(),
  })
  .strict();

export const closetItemSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    brand: z.string().trim().min(1).nullable(),
    category: assetCategorySchema.or(z.string().trim().min(1)).nullable(),
    status: z.enum(["pending", "ready", "failed"]),
    heroImageUrl: z.string().trim().min(1),
    originalImageUrl: z.string().trim().min(1),
    cutoutImageUrl: z.string().trim().min(1).nullable(),
    sourceUrl: z.string().trim().min(1).nullable(),
    metadata: assetMetadataSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const canvasLookDataSchema = canvasCompositionSchema;

export const canvasLookInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(280).optional().nullable(),
    previewImage: z.string().trim().min(1),
    data: canvasLookDataSchema,
    isPublic: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.title !== value.data.title) {
      context.addIssue({
        code: "custom",
        path: ["title"],
        message: "title must match data.title",
      });
    }
  });

export const canvasLookSummarySchema = z
  .object({
    id: z.string().trim().min(1),
    shareSlug: z.string().trim().min(1),
    title: z.string().trim().min(1),
    previewImage: z.string().trim().min(1),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const canvasLookRecordSchema = canvasLookSummarySchema
  .extend({
    description: z.string().trim().max(280).nullable(),
    data: canvasLookDataSchema.nullable(),
    isPublic: z.boolean(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const canvasLookCreateResponseSchema = z
  .object({
    id: z.string().trim().min(1),
    shareSlug: z.string().trim().min(1),
  })
  .strict();

export const canvasLookListResponseSchema = z
  .object({
    looks: z.array(canvasLookSummarySchema),
  })
  .strict();

export const canvasLookGetResponseSchema = z
  .object({
    look: canvasLookRecordSchema,
  })
  .strict();

export const canvasLookDeleteResponseSchema = z
  .object({
    status: z.literal("deleted"),
  })
  .strict();

const bodyProfileRecordVersionSchema = z.union([z.literal(1), z.literal(2)]).default(2);

// Active `/v1/profile/body-profile` product contract with read compatibility for older local records.
export const bodyProfileRecordSchema = z
  .object({
    profile: bodyProfileInputSchema,
    version: bodyProfileRecordVersionSchema,
    updatedAt: z.iso.datetime().optional(),
  })
  .strict()
  .transform(({ profile, updatedAt }) => ({
    profile,
    version: 2 as const,
    updatedAt,
  }));

// Active request payload for `/v1/profile/body-profile`, with legacy flat-profile compatibility.
export const bodyProfileUpsertInputSchema = z
  .object({
    profile: bodyProfileInputSchema,
  })
  .strict();

export const bodyProfileGetResponseSchema = z
  .object({
    bodyProfile: bodyProfileRecordSchema.nullable(),
  })
  .strict();

export const bodyProfilePutResponseSchema = z
  .object({
    bodyProfile: bodyProfileRecordSchema,
  })
  .strict();

export type WidgetConfigQuery = z.infer<typeof widgetConfigQuerySchema>;
export type WidgetRateLimit = z.infer<typeof widgetRateLimitSchema>;
export type WidgetVersionPolicy = z.infer<typeof widgetVersionPolicySchema>;
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type WidgetIframeMessage = z.infer<typeof widgetIframeMessageSchema>;
export type WidgetEventInput = z.infer<typeof widgetEventInputSchema>;
export type WidgetEventsEnvelope = z.infer<typeof widgetEventsEnvelopeSchema>;
export type WidgetAcceptedEvent = z.infer<typeof widgetAcceptedEventSchema>;
export type WidgetRejectedEvent = z.infer<typeof widgetRejectedEventSchema>;
export type WidgetEventsResponse = z.infer<typeof widgetEventsResponseSchema>;
export type WidgetErrorResponse = z.infer<typeof widgetErrorResponseSchema>;
export type AvatarGender = z.infer<typeof avatarGenderSchema>;
export type BodyFrame = z.infer<typeof bodyFrameSchema>;
export type BodyProfile = z.infer<typeof bodyProfileSchema>;
export type BodyProfileSimple = z.infer<typeof bodyProfileSimpleSchema>;
export type BodyProfileDetailed = z.infer<typeof bodyProfileDetailedSchema>;
export type BodyProfileRecord = z.infer<typeof bodyProfileRecordSchema>;
export type BodyProfileUpsertInput = z.infer<typeof bodyProfileUpsertInputSchema>;
export type BodyProfileGetResponse = z.infer<typeof bodyProfileGetResponseSchema>;
export type BodyProfilePutResponse = z.infer<typeof bodyProfilePutResponseSchema>;
export type LegacyBodyProfileFlat = z.infer<typeof legacyBodyProfileFlatSchema>;
export type AvatarRenderVariantId = z.infer<typeof avatarRenderVariantIdSchema>;
export type AvatarPoseId = z.infer<typeof avatarPoseIdSchema>;
export type QualityTier = z.infer<typeof qualityTierSchema>;
export type AvatarMeasurementDerivationMethod = z.infer<typeof avatarMeasurementsDerivationMethodSchema>;
export type AvatarMeasurementDerivationEntry = z.infer<typeof avatarMeasurementDerivationEntrySchema>;
export type AvatarReferenceMeasurements = z.infer<typeof avatarReferenceMeasurementsSchema>;
export type AvatarMeasurementsDerivation = z.infer<typeof avatarMeasurementsDerivationSchema>;
export type AvatarMeasurementsSidecar = z.infer<typeof avatarMeasurementsSidecarSchema>;
export type FitCalibrationComparisonEntry = z.infer<typeof fitCalibrationComparisonEntrySchema>;
export type FitCalibrationReferenceComparison = z.infer<typeof fitCalibrationReferenceComparisonSchema>;
export type AvatarCalibrationReference = z.infer<typeof avatarCalibrationReferenceSchema>;
export type FitCalibrationArchetype = z.infer<typeof fitCalibrationArchetypeSchema>;
export type FitCalibrationGarmentArchetype = z.infer<typeof fitCalibrationGarmentArchetypeSchema>;
export type FitCalibrationGarment = z.infer<typeof fitCalibrationGarmentSchema>;
export type FitCalibrationReport = z.infer<typeof fitCalibrationReportSchema>;
export type FitSimulationQualityTier = z.infer<typeof fitSimulationQualityTierSchema>;
export type FitSimulationArtifactKind = z.infer<typeof fitSimulationArtifactKindSchema>;
export type FitSimulationArtifact = z.infer<typeof fitSimulationArtifactSchema>;
export type FitMapOverlayKind = z.infer<typeof fitMapOverlayKindSchema>;
export type FitMapRegionScore = z.infer<typeof fitMapRegionScoreSchema>;
export type FitMapOverlay = z.infer<typeof fitMapOverlaySchema>;
export type FitMapArtifactData = z.infer<typeof fitMapArtifactDataSchema>;
export type FitSimulateHQJobPayload = z.infer<typeof fitSimulateHQJobPayloadSchema>;
export type FitSimulateHQRequest = z.infer<typeof fitSimulateHQRequestSchema>;
export type FitSimulateHQJobPayloadInput = z.infer<typeof fitSimulateHQJobPayloadInputSchema>;
export type FitSimulateHQMetrics = z.infer<typeof fitSimulateHQMetricsSchema>;
export type FitSimulateHQResultData = z.infer<typeof fitSimulateHQResultDataSchema>;
export type FitSimulateHQResultEnvelope = z.infer<typeof fitSimulateHQResultEnvelopeSchema>;
export type FitSimulationStatus = z.infer<typeof fitSimulationStatusSchema>;
export type FitSimulationRecord = z.infer<typeof fitSimulationRecordSchema>;
export type FitSimulationCreateResponse = z.infer<typeof fitSimulationCreateResponseSchema>;
export type FitSimulationGetResponse = z.infer<typeof fitSimulationGetResponseSchema>;
export type AssetCategory = z.infer<typeof assetCategorySchema>;
export type AssetSource = z.infer<typeof assetSourceSchema>;
export type GarmentMeasurementKey = z.infer<typeof garmentMeasurementKeySchema>;
export type AssetMetadata = z.infer<typeof assetMetadataSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateInputSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type GarmentFitState = z.infer<typeof garmentFitStateSchema>;
export type GarmentFitRisk = z.infer<typeof garmentFitRiskSchema>;
export type GarmentFitDimensionAssessment = z.infer<typeof garmentFitDimensionAssessmentSchema>;
export type GarmentFitAssessment = z.infer<typeof garmentFitAssessmentSchema>;
export type GarmentFitOverall = z.infer<typeof garmentFitOverallSchema>;
export type GarmentFitRegionId = z.infer<typeof garmentFitRegionIdSchema>;
export type GarmentInstantFitRegion = z.infer<typeof garmentInstantFitRegionSchema>;
export type GarmentInstantFitReport = z.infer<typeof garmentInstantFitReportSchema>;
export type GarmentAuthoringSummary = z.infer<typeof garmentAuthoringSummarySchema>;
export type HairAuthoringSummary = z.infer<typeof hairAuthoringSummarySchema>;
export type AccessoryAuthoringSummary = z.infer<typeof accessoryAuthoringSummarySchema>;
export type RuntimeAssetAuthoringSummary = z.infer<typeof runtimeAssetAuthoringSummarySchema>;
export type PublishedRuntimeGarmentItemResponse = z.infer<typeof publishedRuntimeGarmentItemResponseSchema>;
export type PublishedRuntimeGarmentListResponse = z.infer<typeof publishedRuntimeGarmentListResponseSchema>;
export type ClosetRuntimeGarmentItem = z.infer<typeof closetRuntimeGarmentItemSchema>;
export type ClosetRuntimeGarmentItemResponse = z.infer<typeof closetRuntimeGarmentItemResponseSchema>;
export type ClosetRuntimeGarmentListResponse = z.infer<typeof closetRuntimeGarmentListResponseSchema>;
export type ClosetItem = z.infer<typeof closetItemSchema>;
export type CanvasLookData = z.infer<typeof canvasLookDataSchema>;
export type ClosetSceneState = z.infer<typeof closetSceneStateSchema>;
export type CanvasItem = z.infer<typeof canvasItemSchema>;
export type CanvasComposition = z.infer<typeof canvasCompositionSchema>;
export type CanvasLookInput = z.infer<typeof canvasLookInputSchema>;
export type CanvasLookSummary = z.infer<typeof canvasLookSummarySchema>;
export type CanvasLookRecord = z.infer<typeof canvasLookRecordSchema>;
export type CanvasLookCreateResponse = z.infer<typeof canvasLookCreateResponseSchema>;
export type CanvasLookListResponse = z.infer<typeof canvasLookListResponseSchema>;
export type CanvasLookGetResponse = z.infer<typeof canvasLookGetResponseSchema>;
export type CanvasLookDeleteResponse = z.infer<typeof canvasLookDeleteResponseSchema>;

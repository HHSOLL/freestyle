import { z } from "zod";
export type {
  BodyProfile,
  BodyProfileRecord,
  BodyProfileUpsertInput,
  FlattenedBodyProfile,
  GarmentFitProfile,
  GarmentMeasurements,
  GarmentProfile,
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

export const measurementCmSchema = z.number().min(0).max(400);

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
    simple: bodyProfileSimpleSchema,
    detailed: bodyProfileDetailedSchema.optional(),
  })
  .strict();

export const assetCategorySchema = z.enum([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "custom",
]);

export const assetSourceSchema = z.enum(["inventory", "upload", "url", "import"]);

export const garmentMeasurementsSchema = z
  .object({
    chestCm: measurementCmSchema.optional(),
    waistCm: measurementCmSchema.optional(),
    hipCm: measurementCmSchema.optional(),
    shoulderCm: measurementCmSchema.optional(),
    sleeveLengthCm: measurementCmSchema.optional(),
    lengthCm: measurementCmSchema.optional(),
    inseamCm: measurementCmSchema.optional(),
    riseCm: measurementCmSchema.optional(),
    hemCm: measurementCmSchema.optional(),
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

export const assetUpdateInputSchema = z
  .object({
    category: assetCategorySchema.optional(),
    metadata: assetMetadataSchema.optional(),
  })
  .strict();

// Reserved for future `/v1/body-profiles/me` persistence endpoint (not implemented yet).
export const bodyProfileRecordSchema = z
  .object({
    profile: bodyProfileSchema,
    version: z.literal(1).default(1),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict();

// Reserved future request payload for body profile persistence.
export const bodyProfileUpsertInputSchema = z
  .object({
    profile: bodyProfileSchema,
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
export type BodyProfileSimple = z.infer<typeof bodyProfileSimpleSchema>;
export type BodyProfileDetailed = z.infer<typeof bodyProfileDetailedSchema>;
export type LegacyBodyProfileFlat = z.infer<typeof legacyBodyProfileFlatSchema>;
export type AssetCategory = z.infer<typeof assetCategorySchema>;
export type AssetSource = z.infer<typeof assetSourceSchema>;
export type AssetMetadata = z.infer<typeof assetMetadataSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateInputSchema>;
export type Asset = z.infer<typeof assetSchema>;

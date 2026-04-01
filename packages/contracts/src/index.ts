import { z } from "zod";

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

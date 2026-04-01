import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  widgetConfigQuerySchema,
  widgetConfigSchema,
  widgetErrorCodes,
  widgetEventsEnvelopeSchema,
  widgetEventsResponseSchema,
  widgetEventInputSchema,
  type WidgetAcceptedEvent,
  type WidgetConfig,
  type WidgetConfigQuery,
  type WidgetRejectedEvent,
} from "../../../../packages/contracts/src/index.js";
import { buildOriginPolicy } from "../lib/originPolicy.js";

const WIDGET_ID = process.env.WIDGET_ID?.trim() || "freestyle-widget";
const WIDGET_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const WIDGET_RATE_LIMIT_MAX_EVENTS = 60;
const WIDGET_RATE_LIMIT_WINDOW_MS = 60 * 1000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const dedupeStore = new Map<string, number>();
const rateLimitStore = new Map<string, RateLimitBucket>();

const getHeaderValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const parseOriginFromValue = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

const extractRequestOrigin = (request: FastifyRequest) => {
  const directOrigin = getHeaderValue(request.headers.origin)?.trim();
  if (directOrigin) {
    return directOrigin;
  }

  const referer = getHeaderValue(request.headers.referer)?.trim();
  return parseOriginFromValue(referer);
};

const getPublicApiOrigin = (request: FastifyRequest) => {
  const configured = process.env.API_PUBLIC_ORIGIN?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain.replace(/\/+$/, "")}`;
  }

  const forwardedProto = getHeaderValue(request.headers["x-forwarded-proto"])?.split(",")[0]?.trim();
  const forwardedHost = getHeaderValue(request.headers["x-forwarded-host"])?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.protocol || "http";
  const host = forwardedHost || request.headers.host;

  if (!host) {
    throw new Error("Unable to determine widget public API host.");
  }

  return `${protocol}://${host}`;
};

const buildWidgetOriginPolicy = () =>
  buildOriginPolicy(
    process.env.WIDGET_ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN,
    process.env.WIDGET_ALLOWED_ORIGIN_PATTERNS ?? process.env.CORS_ORIGIN_PATTERNS
  );

const isWidgetEnabled = () => process.env.WIDGET_CONFIG_DISABLED?.trim().toLowerCase() !== "true";

const pruneExpiredState = (now: number) => {
  for (const [key, expiresAt] of dedupeStore.entries()) {
    if (expiresAt <= now) {
      dedupeStore.delete(key);
    }
  }

  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

const consumeRateLimit = (key: string, eventCount: number, now: number) => {
  const current = rateLimitStore.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WIDGET_RATE_LIMIT_WINDOW_MS } : current;

  if (bucket.count + eventCount > WIDGET_RATE_LIMIT_MAX_EVENTS) {
    rateLimitStore.set(key, bucket);
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += eventCount;
  rateLimitStore.set(key, bucket);
  return {
    allowed: true as const,
    retryAfterSeconds: 0,
  };
};

const buildDedupeKey = (origin: string, eventId: string, idempotencyKey?: string) =>
  `${origin}::${idempotencyKey ?? eventId}`;

const parseWidgetFeatureFlags = (): Record<string, boolean> => {
  const raw = process.env.WIDGET_FEATURE_FLAGS?.trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const flags: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key.trim().length > 0 && typeof value === "boolean") {
        flags[key] = value;
      }
    }

    return flags;
  } catch {
    return {};
  }
};

const resolveWidgetTheme = (): WidgetConfig["theme"] => {
  const mode = process.env.WIDGET_THEME_MODE;
  const accent = process.env.WIDGET_THEME_ACCENT?.trim();

  return {
    mode: mode === "light" || mode === "dark" ? mode : "auto",
    accent: accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#D1B278",
  };
};

const buildWidgetConfig = (
  request: FastifyRequest,
  query: WidgetConfigQuery,
  widgetOriginPolicy: ReturnType<typeof buildWidgetOriginPolicy>,
): WidgetConfig => {
  const publicApiOrigin = getPublicApiOrigin(request);
  const widgetConfigTtlSeconds = Number.parseInt(process.env.WIDGET_CONFIG_TTL_SECONDS || "900", 10);
  const expiresAt = new Date(Date.now() + Math.max(60, widgetConfigTtlSeconds) * 1000).toISOString();

  return {
    widget_id: WIDGET_ID,
    tenant_id: query.tenant_id,
    product_id: query.product_id,
    api_base_url: `${publicApiOrigin}/v1`,
    events_endpoint: "/v1/widget/events",
    script_url: process.env.WIDGET_SCRIPT_URL?.trim() || `${publicApiOrigin}/widget/sdk.js`,
    stylesheet_url: process.env.WIDGET_STYLESHEET_URL?.trim() || `${publicApiOrigin}/widget/sdk.css`,
    asset_base_url: process.env.WIDGET_ASSET_BASE_URL?.trim() || `${publicApiOrigin}/assets`,
    allowed_origins: [...widgetOriginPolicy.exactOrigins, ...widgetOriginPolicy.patternStrings],
    feature_flags: parseWidgetFeatureFlags(),
    theme: resolveWidgetTheme(),
    expires_at: expiresAt,
    dedupe_window_seconds: Math.floor(WIDGET_DEDUPE_WINDOW_MS / 1000),
    partial_accept: true,
    rate_limit: {
      max_events: WIDGET_RATE_LIMIT_MAX_EVENTS,
      window_seconds: Math.floor(WIDGET_RATE_LIMIT_WINDOW_MS / 1000),
    },
    error_codes: [...widgetErrorCodes],
  };
};

const extractEventId = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>).event_id;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
};

export const __widgetRouteTestUtils = {
  reset() {
    dedupeStore.clear();
    rateLimitStore.clear();
  },
};

export const registerWidgetRoutes = (app: FastifyInstance) => {
  app.get("/widget/config", async (request, reply) => {
    const widgetOriginPolicy = buildWidgetOriginPolicy();
    const parsedQuery = widgetConfigQuerySchema.safeParse(request.query ?? {});
    if (!parsedQuery.success) {
      return reply.code(400).send({
        error: "WIDGET_CONFIG_NOT_FOUND",
        message: parsedQuery.error.issues[0]?.message ?? "Invalid widget config query.",
      });
    }

    if (!isWidgetEnabled()) {
      request.log.warn("Widget config requested while widget is disabled");
      return reply.code(404).send({
        error: "WIDGET_CONFIG_NOT_FOUND",
        message: "Widget config is not available.",
      });
    }

    if (parsedQuery.data.widget_id && parsedQuery.data.widget_id !== WIDGET_ID) {
      return reply.code(404).send({
        error: "WIDGET_CONFIG_NOT_FOUND",
        message: "Widget config is not available for the requested widget_id.",
      });
    }

    const config = widgetConfigSchema.parse(buildWidgetConfig(request, parsedQuery.data, widgetOriginPolicy));
    return reply.send(config);
  });

  app.post("/widget/events", async (request, reply) => {
    const originPolicy = buildWidgetOriginPolicy();
    const requestOrigin = extractRequestOrigin(request);

    if (!requestOrigin || !originPolicy.isAllowedOrigin(requestOrigin)) {
      request.log.warn({ origin: requestOrigin ?? null }, "Rejected widget event request due to origin policy");
      return reply.code(403).send({
        error: "WIDGET_ORIGIN_DENIED",
        message: "Widget origin is not allowed.",
      });
    }

    const parsedEnvelope = widgetEventsEnvelopeSchema.safeParse(request.body);
    if (!parsedEnvelope.success) {
      request.log.warn({ issues: parsedEnvelope.error.issues }, "Rejected widget events payload");
      return reply.code(400).send({
        error: "WIDGET_EVENT_INVALID",
        message: parsedEnvelope.error.issues[0]?.message ?? "Invalid widget events payload.",
      });
    }

    const now = Date.now();
    pruneExpiredState(now);

    const rateLimitKey = `${request.ip}::${requestOrigin}`;
    const rateLimit = consumeRateLimit(rateLimitKey, parsedEnvelope.data.events.length, now);
    if (!rateLimit.allowed) {
      request.log.warn(
        { origin: requestOrigin, ip: request.ip, retryAfterSeconds: rateLimit.retryAfterSeconds },
        "Rate limited widget events request",
      );
      return reply
        .code(429)
        .header("retry-after", String(rateLimit.retryAfterSeconds))
        .send({
          error: "WIDGET_EVENT_RATE_LIMITED",
          message: "Widget event rate limit exceeded.",
        });
    }

    const accepted: WidgetAcceptedEvent[] = [];
    const rejected: WidgetRejectedEvent[] = [];
    let acceptedCount = 0;
    let duplicateCount = 0;

    for (const candidate of parsedEnvelope.data.events) {
      const parsedEvent = widgetEventInputSchema.safeParse(candidate);
      if (!parsedEvent.success) {
        rejected.push({
          event_id: extractEventId(candidate),
          code: "WIDGET_EVENT_INVALID",
          message: parsedEvent.error.issues[0]?.message ?? "Invalid widget event payload.",
        });
        continue;
      }

      if (
        parsedEvent.data.tenant_id !== parsedEnvelope.data.tenant_id
        || parsedEvent.data.product_id !== parsedEnvelope.data.product_id
      ) {
        rejected.push({
          event_id: parsedEvent.data.event_id,
          code: "WIDGET_EVENT_INVALID",
          message: "tenant_id or product_id does not match request envelope.",
        });
        continue;
      }

      const dedupeKey = buildDedupeKey(
        requestOrigin,
        parsedEvent.data.event_id,
        parsedEvent.data.idempotency_key,
      );
      const dedupeUntil = dedupeStore.get(dedupeKey);
      if (dedupeUntil && dedupeUntil > now) {
        duplicateCount += 1;
        accepted.push({
          event_id: parsedEvent.data.event_id,
          status: "duplicate",
        });
        continue;
      }

      dedupeStore.set(dedupeKey, now + WIDGET_DEDUPE_WINDOW_MS);
      acceptedCount += 1;
      accepted.push({
        event_id: parsedEvent.data.event_id,
        status: "accepted",
      });

      request.log.info(
        {
          widgetEvent: {
            eventId: parsedEvent.data.event_id,
            eventName: parsedEvent.data.event_name,
            origin: requestOrigin,
            widgetId: parsedEvent.data.widget_id ?? WIDGET_ID,
          },
        },
        "Accepted widget event",
      );
    }

    const response = widgetEventsResponseSchema.parse({
      request_id: request.id,
      received_count: parsedEnvelope.data.events.length,
      accepted_count: acceptedCount,
      duplicate_count: duplicateCount,
      rejected_count: rejected.length,
      accepted,
      rejected,
    });

    const statusCode = response.accepted_count > 0 || response.duplicate_count > 0 ? 202 : 400;
    if (statusCode === 400) {
      request.log.warn({ rejectedCount: response.rejected_count }, "Rejected all widget events in request");
    }

    return reply.code(statusCode).send(response);
  });
};

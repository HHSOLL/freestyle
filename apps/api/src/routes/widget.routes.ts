import { createHash } from "node:crypto";
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
import { LEGACY_API_PREFIX, LEGACY_WIDGET_ASSET_PREFIX } from "../lib/route-namespaces.js";

const WIDGET_ID = process.env.WIDGET_ID?.trim() || "freestyle-widget";
const WIDGET_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const WIDGET_EVENT_REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const WIDGET_EVENT_FUTURE_SKEW_MS = 5 * 60 * 1000;
const WIDGET_RATE_LIMIT_MAX_EVENTS = 60;
const WIDGET_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const WIDGET_CACHE_CONTROL_MUTABLE = "public, max-age=300";
const WIDGET_CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";
const PHASE_0_5_CANARY_ENABLED_FLAG = "phase_0_5_canary_enabled";
const PHASE_0_5_CANARY_KILL_SWITCH_FLAG = "phase_0_5_kill_switch";
const ALLOWED_PHASE_0_5_CANARY_PERCENTAGES = new Set([0, 1, 5, 25, 100]);

const WIDGET_SDK_CSS_SOURCE = `
.freestyle-widget-root {
  box-sizing: border-box;
  display: block;
  width: 100%;
  border-radius: 24px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background:
    radial-gradient(circle at top, rgba(209, 178, 120, 0.18), transparent 48%),
    rgba(255, 255, 255, 0.92);
  color: #111111;
  font-family: "A2J", "Helvetica Neue", sans-serif;
  box-shadow: 0 28px 80px rgba(17, 17, 17, 0.12);
  backdrop-filter: blur(24px);
  overflow: hidden;
}

.freestyle-widget-root,
.freestyle-widget-root * {
  box-sizing: border-box;
}

.freestyle-widget-shell {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.freestyle-widget-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  background: rgba(255, 255, 255, 0.72);
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(17, 17, 17, 0.56);
}

.freestyle-widget-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.freestyle-widget-body {
  margin: 0;
  max-width: 56ch;
  color: rgba(17, 17, 17, 0.64);
  font-size: 14px;
  line-height: 1.75;
}

.freestyle-widget-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.freestyle-widget-button {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
}

.freestyle-widget-button-primary {
  background: #111111;
  color: #ffffff;
}

.freestyle-widget-button-secondary {
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: rgba(255, 255, 255, 0.7);
  color: #111111;
}

.freestyle-widget-status {
  margin: 0;
  font-size: 12px;
  color: rgba(17, 17, 17, 0.48);
}

.freestyle-widget-frame {
  width: 100%;
  min-height: 560px;
  border: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
}
`.trim();

const buildWidgetSdkJsSource = (options: { apiBasePath: string; assetBasePath: string }) => `
(() => {
  const globalWindow = window;
  const scriptElement = document.currentScript;
  const assetOrigin = (() => {
    try {
      return scriptElement && scriptElement.src ? new URL(scriptElement.src).origin : window.location.origin;
    } catch {
      return window.location.origin;
    }
  })();
  const apiBaseUrl = assetOrigin + "${options.apiBasePath}";

  const toError = (code, message, cause) => ({
    code,
    message,
    recoverable: true,
    cause,
  });

  const resolveWidgetOrigin = (config) => {
    try {
      const parsed = new URL(config.api_base_url || apiBaseUrl, assetOrigin);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Widget api_base_url must use http or https.");
      }
      return parsed.origin;
    } catch (error) {
      throw toError("WIDGET_MOUNT_FAILED", "Widget config returned an invalid api_base_url.", error);
    }
  };

  const resolveSameOriginUrl = (value, origin, code, message) => {
    let nextUrl;
    try {
      nextUrl = new URL(value, origin);
    } catch (error) {
      throw toError(code, message, error);
    }

    if (nextUrl.origin !== origin) {
      throw toError(code, message);
    }

    return nextUrl.toString();
  };

  const isWidgetMessage = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    return typeof value.type === "string"
      && typeof value.version === "string"
      && typeof value.eventId === "string"
      && Object.prototype.hasOwnProperty.call(value, "payload");
  };

  const ensureMountTarget = (mount) => {
    const target = typeof mount === "string" ? document.querySelector(mount) : mount;
    if (!target) {
      throw toError("WIDGET_MOUNT_FAILED", "Mount target not found.");
    }
    return target;
  };

  const injectStylesheet = (href, integrity) => {
    const existing = document.querySelector('link[data-freestyle-widget-style="true"]');
    if (existing) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.freestyleWidgetStyle = "true";
    if (integrity) {
      link.integrity = integrity;
      link.crossOrigin = "anonymous";
    }
    document.head.appendChild(link);
  };

  const renderScriptSurface = (mountTarget, config, options) => {
    const root = document.createElement("section");
    root.className = "freestyle-widget-root";
    root.innerHTML = [
      '<div class="freestyle-widget-shell">',
      '  <span class="freestyle-widget-pill">FreeStyle Widget</span>',
      '  <h2 class="freestyle-widget-title">Embed-ready outfit entry point</h2>',
      '  <p class="freestyle-widget-body">This runtime is served directly from the API and aligned with the widget config contract. Use your host actions to collect config, telemetry, and mount state safely.</p>',
      '  <div class="freestyle-widget-actions">',
      '    <button type="button" class="freestyle-widget-button freestyle-widget-button-primary" data-widget-action="loaded">Track loaded</button>',
      '    <button type="button" class="freestyle-widget-button freestyle-widget-button-secondary" data-widget-action="open">Open product</button>',
      '  </div>',
      '  <p class="freestyle-widget-status">Tenant: ' + config.tenant_id + ' · Product: ' + config.product_id + '</p>',
      '</div>',
    ].join("");

    root.querySelector('[data-widget-action="loaded"]')?.addEventListener("click", async () => {
      await handle.track({
        event_id: (crypto.randomUUID && crypto.randomUUID()) || ("evt_" + Date.now()),
        event_name: "widget_loaded",
        tenant_id: config.tenant_id,
        product_id: config.product_id,
        page_url: window.location.href,
        occurred_at: new Date().toISOString(),
        payload: { mode: "script" },
      });
    });

    root.querySelector('[data-widget-action="open"]')?.addEventListener("click", () => {
      options.onError && options.onError(toError("WIDGET_MOUNT_FAILED", "No host navigation action is wired for this widget button."));
    });

    mountTarget.replaceChildren(root);

    const handle = {
      config,
      destroy() {
        root.remove();
      },
      async track(events) {
        const payloadEvents = Array.isArray(events) ? events : [events];
        payloadEvents.forEach((event) => options.onEvent && options.onEvent(event));
        const widgetOrigin = resolveWidgetOrigin(config);
        const eventsUrl = resolveSameOriginUrl(
          config.events_endpoint,
          widgetOrigin,
          "WIDGET_ORIGIN_DENIED",
          "Widget events endpoint must remain on the widget API origin.",
        );
        const response = await fetch(eventsUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tenant_id: config.tenant_id,
            product_id: config.product_id,
            events: payloadEvents,
          }),
        });
        if (!response.ok && response.status !== 202) {
          throw toError("WIDGET_EVENT_INVALID", "Failed to deliver widget events.");
        }
        return await response.json();
      },
    };

    return handle;
  };

  const renderIframeSurface = (mountTarget, config, options) => {
    const widgetOrigin = resolveWidgetOrigin(config);
    const iframe = document.createElement("iframe");
    iframe.className = "freestyle-widget-frame";
    iframe.title = "FreeStyle Widget";
    iframe.sandbox = "allow-scripts allow-same-origin";
    iframe.referrerPolicy = "no-referrer";
    iframe.src = resolveSameOriginUrl(
      "${options.assetBasePath}/frame?tenant_id=" + encodeURIComponent(config.tenant_id) + "&product_id=" + encodeURIComponent(config.product_id),
      widgetOrigin,
      "WIDGET_MOUNT_FAILED",
      "Widget frame endpoint must remain on the widget API origin.",
    );
    mountTarget.replaceChildren(iframe);

    const handleMessage = (event) => {
      const iframeWindow = iframe.contentWindow;
      if (iframeWindow && event.source && event.source !== iframeWindow) {
        return;
      }

      if (event.origin !== widgetOrigin) {
        options.onError && options.onError(
          toError("WIDGET_ORIGIN_DENIED", "Rejected iframe message from unexpected origin: " + (event.origin || "unknown")),
        );
        return;
      }

      if (!isWidgetMessage(event.data)) {
        options.onError && options.onError(
          toError("WIDGET_EVENT_INVALID", "Rejected malformed iframe message."),
        );
      }
    };
    globalWindow.addEventListener("message", handleMessage);

    return {
      config,
      destroy() {
        globalWindow.removeEventListener("message", handleMessage);
        iframe.remove();
      },
      async track(events) {
        const payloadEvents = Array.isArray(events) ? events : [events];
        const eventsUrl = resolveSameOriginUrl(
          config.events_endpoint,
          widgetOrigin,
          "WIDGET_ORIGIN_DENIED",
          "Widget events endpoint must remain on the widget API origin.",
        );
        const response = await fetch(eventsUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tenant_id: config.tenant_id,
            product_id: config.product_id,
            events: payloadEvents,
          }),
        });
        if (!response.ok && response.status !== 202) {
          throw toError("WIDGET_EVENT_INVALID", "Failed to deliver widget events.");
        }
        return await response.json();
      },
    };
  };

  const createClient = () => ({
    async init(options) {
      const mountTarget = ensureMountTarget(options.mount);
      const params = new URLSearchParams({
        tenant_id: options.tenantId,
        product_id: options.productId,
      });
      const response = await fetch(apiBaseUrl + "/widget/config?" + params.toString(), { method: "GET" });
      if (!response.ok) {
        throw toError("WIDGET_CONFIG_NOT_FOUND", "Failed to fetch widget config.");
      }
      const config = await response.json();
      injectStylesheet(config.stylesheet_url, config.stylesheet_integrity);
      return (options.mode || "script") === "iframe"
        ? renderIframeSurface(mountTarget, config, options)
        : renderScriptSurface(mountTarget, config, options);
    },
  });

  const client = createClient();
  globalWindow.FreeStyleWidget = {
    init(options) {
      return client.init(options);
    },
  };
})();
`.trim();

const buildWidgetFrameHtml = (productId: string) => {
  const safeProductLabel = productId
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const safeProductId = JSON.stringify(productId);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FreeStyle Widget Frame</title>
    <style>
      html, body { margin: 0; font-family: "Helvetica Neue", sans-serif; background: #f4f1ea; color: #111; }
      main { padding: 24px; }
      h1 { margin: 0 0 12px; font-size: 28px; letter-spacing: -0.05em; }
      p { margin: 0; color: rgba(17, 17, 17, 0.68); line-height: 1.7; }
    </style>
  </head>
  <body>
    <main>
      <h1>FreeStyle iframe runtime</h1>
      <p>Origin-validated iframe surface for ${safeProductLabel}.</p>
    </main>
    <script>
      if (window.parent) {
        window.parent.postMessage({
          type: "widget.ready",
          version: "1",
          eventId: "evt_ready",
          payload: { productId: ${safeProductId} }
        }, "*");
      }
    </script>
  </body>
</html>
  `.trim();
};

const buildWidgetIntegrity = (source: string) => `sha384-${createHash("sha384").update(source).digest("base64")}`;
const buildWidgetSdkJsIntegrity = (options: { apiBasePath: string; assetBasePath: string }) =>
  buildWidgetIntegrity(buildWidgetSdkJsSource(options));
const WIDGET_SDK_CSS_INTEGRITY = buildWidgetIntegrity(WIDGET_SDK_CSS_SOURCE);
const WIDGET_SDK_ASSET_VERSION = createHash("sha256")
  .update(
    `${buildWidgetSdkJsIntegrity({ apiBasePath: LEGACY_API_PREFIX, assetBasePath: LEGACY_WIDGET_ASSET_PREFIX })}:${WIDGET_SDK_CSS_INTEGRITY}`,
  )
  .digest("hex")
  .slice(0, 16);

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

const buildWidgetFrameAncestors = (
  request: FastifyRequest,
  widgetOriginPolicy: ReturnType<typeof buildWidgetOriginPolicy>,
) => {
  const hasConfiguredPolicy =
    widgetOriginPolicy.exactOrigins.length > 0 || widgetOriginPolicy.patternStrings.length > 0;
  if (!hasConfiguredPolicy) {
    return [];
  }

  const sources = new Set<string>();
  for (const origin of widgetOriginPolicy.exactOrigins) {
    const normalized = parseOriginFromValue(origin);
    if (normalized) {
      sources.add(normalized);
    }
  }

  const requestOrigin = extractRequestOrigin(request);
  if (requestOrigin && widgetOriginPolicy.isAllowedOrigin(requestOrigin)) {
    const normalized = parseOriginFromValue(requestOrigin);
    if (normalized) {
      sources.add(normalized);
    }
  }

  if (sources.size === 0) {
    return [];
  }

  return ["'self'", ...sources];
};

const buildWidgetFrameCsp = (
  request: FastifyRequest,
  widgetOriginPolicy: ReturnType<typeof buildWidgetOriginPolicy>,
) => {
  const directives = [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "img-src data:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'self'",
    "sandbox allow-scripts allow-same-origin",
  ];
  const frameAncestors = buildWidgetFrameAncestors(request, widgetOriginPolicy);
  if (frameAncestors.length > 0) {
    directives.push(`frame-ancestors ${frameAncestors.join(" ")}`);
  }
  return directives.join("; ");
};

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

const hasOwnFlag = (flags: Record<string, boolean>, key: string) =>
  Object.prototype.hasOwnProperty.call(flags, key);

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

const parsePhase05CanaryPercentage = () => {
  const raw = process.env.WIDGET_PHASE_0_5_CANARY_PERCENTAGE?.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!ALLOWED_PHASE_0_5_CANARY_PERCENTAGES.has(parsed)) {
    return undefined;
  }

  return parsed;
};

const buildPhase05CanaryAudienceKey = (parts: {
  anonymousUserId?: string;
  forwardedFor?: string;
  requestIp?: string;
  origin?: string;
  userAgent?: string;
}) => {
  const normalizedOrigin = parts.origin?.trim();
  const normalizedUserAgent = parts.userAgent?.trim();
  const normalizedAnonymousUserId = parts.anonymousUserId?.trim();
  const normalizedForwardedFor = parts.forwardedFor?.trim();
  const normalizedRequestIp = parts.requestIp?.trim();

  if (normalizedAnonymousUserId) {
    return `anonymous:${normalizedAnonymousUserId}`;
  }

  const networkKey = normalizedForwardedFor || normalizedRequestIp;
  if (networkKey) {
    return `network:${networkKey}::origin:${normalizedOrigin || "unknown"}`;
  }

  if (normalizedOrigin && normalizedUserAgent) {
    return `origin:${normalizedOrigin}::user-agent:${normalizedUserAgent}`;
  }

  if (normalizedOrigin) {
    return `origin:${normalizedOrigin}`;
  }

  if (normalizedUserAgent) {
    return `user-agent:${normalizedUserAgent}`;
  }

  return "anonymous-requester";
};

const extractPhase05CanaryAudienceKey = (request: FastifyRequest) =>
  buildPhase05CanaryAudienceKey({
    anonymousUserId: getHeaderValue(request.headers["x-anonymous-user-id"]),
    forwardedFor: getHeaderValue(request.headers["x-forwarded-for"])?.split(",")[0]?.trim(),
    requestIp: request.ip,
    origin: extractRequestOrigin(request) ?? undefined,
    userAgent: getHeaderValue(request.headers["user-agent"]),
  });

const isKeyInCanaryAudience = (audienceKey: string, percentage: number) => {
  if (percentage <= 0) {
    return false;
  }

  if (percentage >= 100) {
    return true;
  }

  const bucket = createHash("sha256").update(audienceKey).digest().readUInt32BE(0) % 100;
  return bucket < percentage;
};

const resolvePhase05CanaryFlag = (
  request: FastifyRequest,
  featureFlags: Record<string, boolean>,
) => {
  const configuredPercentage = parsePhase05CanaryPercentage();
  const hasPhase05Flag = hasOwnFlag(featureFlags, PHASE_0_5_CANARY_ENABLED_FLAG);
  const hasKillSwitch = hasOwnFlag(featureFlags, PHASE_0_5_CANARY_KILL_SWITCH_FLAG);

  if (configuredPercentage === undefined && !hasPhase05Flag && !hasKillSwitch) {
    return featureFlags;
  }

  const nextFeatureFlags = { ...featureFlags };

  if (nextFeatureFlags[PHASE_0_5_CANARY_KILL_SWITCH_FLAG] === true) {
    nextFeatureFlags[PHASE_0_5_CANARY_ENABLED_FLAG] = false;
    return nextFeatureFlags;
  }

  const effectivePercentage = configuredPercentage ?? (nextFeatureFlags[PHASE_0_5_CANARY_ENABLED_FLAG] === true ? 100 : 0);
  nextFeatureFlags[PHASE_0_5_CANARY_ENABLED_FLAG] = isKeyInCanaryAudience(
    extractPhase05CanaryAudienceKey(request),
    effectivePercentage,
  );

  return nextFeatureFlags;
};

const resolveWidgetTheme = (): WidgetConfig["theme"] => {
  const mode = process.env.WIDGET_THEME_MODE;
  const accent = process.env.WIDGET_THEME_ACCENT?.trim();

  return {
    mode: mode === "light" || mode === "dark" ? mode : "auto",
    accent: accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#D1B278",
  };
};

const resolveWidgetVersionPolicy = (): WidgetConfig["widget_version_policy"] =>
  process.env.WIDGET_VERSION_POLICY?.trim().toLowerCase() === "mutable" ? "mutable" : "immutable";

const resolveWidgetIntegrity = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^sha(256|384|512)-[A-Za-z0-9+/=]+$/.test(trimmed) ? trimmed : undefined;
};

const getWidgetCacheControl = () =>
  resolveWidgetVersionPolicy() === "immutable" ? WIDGET_CACHE_CONTROL_IMMUTABLE : WIDGET_CACHE_CONTROL_MUTABLE;

const getDefaultWidgetAssetUrls = (publicApiOrigin: string, assetBasePath: string) => ({
  scriptUrl: `${publicApiOrigin}${assetBasePath}/sdk.js?v=${WIDGET_SDK_ASSET_VERSION}`,
  stylesheetUrl: `${publicApiOrigin}${assetBasePath}/sdk.css?v=${WIDGET_SDK_ASSET_VERSION}`,
});

const resolveWidgetAssetUrls = (publicApiOrigin: string, assetBasePath: string) => {
  const defaults = getDefaultWidgetAssetUrls(publicApiOrigin, assetBasePath);
  const configuredScriptUrl = process.env.WIDGET_SCRIPT_URL?.trim();
  const configuredStylesheetUrl = process.env.WIDGET_STYLESHEET_URL?.trim();

  return {
    scriptUrl: configuredScriptUrl || defaults.scriptUrl,
    stylesheetUrl: configuredStylesheetUrl || defaults.stylesheetUrl,
    isDefaultScriptUrl: !configuredScriptUrl,
    isDefaultStylesheetUrl: !configuredStylesheetUrl,
  };
};

const getOccurredAtValidationError = (occurredAt: string | undefined, now: number) => {
  if (!occurredAt) {
    return null;
  }

  const occurredAtMs = Date.parse(occurredAt);
  if (Number.isNaN(occurredAtMs)) {
    return "occurred_at must be a valid ISO datetime.";
  }

  if (occurredAtMs < now - WIDGET_EVENT_REPLAY_WINDOW_MS) {
    return "occurred_at is outside the accepted replay window.";
  }

  if (occurredAtMs > now + WIDGET_EVENT_FUTURE_SKEW_MS) {
    return "occurred_at is too far ahead of server time.";
  }

  return null;
};

const buildWidgetConfig = (
  request: FastifyRequest,
  query: WidgetConfigQuery,
  widgetOriginPolicy: ReturnType<typeof buildWidgetOriginPolicy>,
  options: { apiBasePath: string; assetBasePath: string },
): WidgetConfig => {
  const publicApiOrigin = getPublicApiOrigin(request);
  const widgetConfigTtlSeconds = Number.parseInt(process.env.WIDGET_CONFIG_TTL_SECONDS || "900", 10);
  const expiresAt = new Date(Date.now() + Math.max(60, widgetConfigTtlSeconds) * 1000).toISOString();
  const assetUrls = resolveWidgetAssetUrls(publicApiOrigin, options.assetBasePath);
  const featureFlags = resolvePhase05CanaryFlag(request, parseWidgetFeatureFlags());

  return {
    widget_id: WIDGET_ID,
    tenant_id: query.tenant_id,
    product_id: query.product_id,
    api_base_url: `${publicApiOrigin}${options.apiBasePath}`,
    events_endpoint: `${options.apiBasePath}/widget/events`,
    script_url: assetUrls.scriptUrl,
    script_integrity: assetUrls.isDefaultScriptUrl
      ? buildWidgetSdkJsIntegrity(options)
      : resolveWidgetIntegrity(process.env.WIDGET_SCRIPT_INTEGRITY),
    stylesheet_url: assetUrls.stylesheetUrl,
    stylesheet_integrity: assetUrls.isDefaultStylesheetUrl
      ? WIDGET_SDK_CSS_INTEGRITY
      : resolveWidgetIntegrity(process.env.WIDGET_STYLESHEET_INTEGRITY),
    asset_base_url: process.env.WIDGET_ASSET_BASE_URL?.trim() || `${publicApiOrigin}/assets`,
    widget_version_policy: resolveWidgetVersionPolicy(),
    allowed_origins: [...widgetOriginPolicy.exactOrigins, ...widgetOriginPolicy.patternStrings],
    feature_flags: featureFlags,
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
  buildPhase05CanaryAudienceKey,
  isKeyInCanaryAudience,
};

export const registerWidgetAssetRoutes = (
  app: FastifyInstance,
  options: { assetBasePath?: string; apiBasePath?: string } = {},
) => {
  const assetBasePath = options.assetBasePath ?? LEGACY_WIDGET_ASSET_PREFIX;
  const apiBasePath = options.apiBasePath ?? LEGACY_API_PREFIX;

  app.get(`${assetBasePath}/sdk.js`, async (_request, reply) => {
    const widgetSdkJs = buildWidgetSdkJsSource({ apiBasePath, assetBasePath });
    return reply
      .code(200)
      .type("application/javascript; charset=utf-8")
      .header("cache-control", getWidgetCacheControl())
      .header("x-freestyle-surface", "legacy")
      .header("deprecation", "true")
      .header("x-widget-integrity", buildWidgetSdkJsIntegrity({ apiBasePath, assetBasePath }))
      .send(widgetSdkJs);
  });

  app.get(`${assetBasePath}/sdk.css`, async (_request, reply) => {
    return reply
      .code(200)
      .type("text/css; charset=utf-8")
      .header("cache-control", getWidgetCacheControl())
      .header("x-freestyle-surface", "legacy")
      .header("deprecation", "true")
      .header("x-widget-integrity", WIDGET_SDK_CSS_INTEGRITY)
      .send(WIDGET_SDK_CSS_SOURCE);
  });

  app.get(`${assetBasePath}/frame`, async (request, reply) => {
    const widgetOriginPolicy = buildWidgetOriginPolicy();
    const query = (request.query ?? {}) as { product_id?: unknown };
    const productId = typeof query.product_id === "string" && query.product_id.trim().length > 0
      ? query.product_id.trim()
      : "unknown-product";

    return reply
      .code(200)
      .type("text/html; charset=utf-8")
      .header("cache-control", getWidgetCacheControl())
      .header("x-freestyle-surface", "legacy")
      .header("deprecation", "true")
      .header("content-security-policy", buildWidgetFrameCsp(request, widgetOriginPolicy))
      .header("referrer-policy", "no-referrer")
      .header("x-content-type-options", "nosniff")
      .send(buildWidgetFrameHtml(productId));
  });
};

export const registerWidgetRoutes = (
  app: FastifyInstance,
  options: { apiBasePath?: string; assetBasePath?: string } = {},
) => {
  const apiBasePath = options.apiBasePath ?? LEGACY_API_PREFIX;
  const assetBasePath = options.assetBasePath ?? LEGACY_WIDGET_ASSET_PREFIX;

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

    const config = widgetConfigSchema.parse(
      buildWidgetConfig(request, parsedQuery.data, widgetOriginPolicy, { apiBasePath, assetBasePath }),
    );
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

      const occurredAtValidationError = getOccurredAtValidationError(parsedEvent.data.occurred_at, now);
      if (occurredAtValidationError) {
        rejected.push({
          event_id: parsedEvent.data.event_id,
          code: "WIDGET_EVENT_INVALID",
          message: occurredAtValidationError,
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
    request.log.info(
      {
        widgetEventsRequest: {
          requestId: request.id,
          origin: requestOrigin,
          ip: request.ip,
          receivedCount: response.received_count,
          acceptedCount: response.accepted_count,
          duplicateCount: response.duplicate_count,
          rejectedCount: response.rejected_count,
        },
      },
      "Processed widget events request",
    );

    if (statusCode === 400) {
      request.log.warn({ rejectedCount: response.rejected_count }, "Rejected all widget events in request");
    }

    return reply.code(statusCode).send(response);
  });
};

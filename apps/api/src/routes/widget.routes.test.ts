import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../main.js";
import { __widgetRouteTestUtils } from "./widget.routes.js";

const buildSri = (source: string) => `sha384-${createHash("sha384").update(source).digest("base64")}`;
const widgetApiBase = "/v1/legacy/widget";
const widgetAssetBase = "/legacy/widget";

test.beforeEach(() => {
  __widgetRouteTestUtils.reset();
  delete process.env.CORS_ORIGIN;
  delete process.env.CORS_ORIGIN_PATTERNS;
  delete process.env.WIDGET_ALLOWED_ORIGINS;
  delete process.env.WIDGET_ALLOWED_ORIGIN_PATTERNS;
  delete process.env.WIDGET_CONFIG_DISABLED;
  delete process.env.WIDGET_FEATURE_FLAGS;
  delete process.env.WIDGET_PHASE_0_5_CANARY_PERCENTAGE;
  delete process.env.API_PUBLIC_ORIGIN;
  delete process.env.WIDGET_SCRIPT_INTEGRITY;
  delete process.env.WIDGET_STYLESHEET_INTEGRITY;
  delete process.env.WIDGET_VERSION_POLICY;
});

const findPhase05CanaryAudienceId = (percentage: number, expected: boolean) => {
  for (let index = 0; index < 10_000; index += 1) {
    const candidate = `canary-user-${index}`;
    const audienceKey = __widgetRouteTestUtils.buildPhase05CanaryAudienceKey({
      anonymousUserId: candidate,
      origin: "https://shop.example",
      userAgent: "widget-test/1.0",
    });

    if (__widgetRouteTestUtils.isKeyInCanaryAudience(audienceKey, percentage) === expected) {
      return candidate;
    }
  }

  throw new Error(`Unable to find phase 0.5 canary audience match for expected=${expected} percentage=${percentage}`);
};

test("GET /v1/legacy/widget/config returns widget bootstrap config", async () => {
  process.env.WIDGET_VERSION_POLICY = "immutable";
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.widget_id, "freestyle-widget");
  assert.equal(payload.tenant_id, "tenant-a");
  assert.equal(payload.product_id, "sku-123");
  assert.equal(payload.events_endpoint, `${widgetApiBase}/events`);
  assert.equal(payload.partial_accept, true);
  assert.equal(payload.dedupe_window_seconds, 86400);
  assert.equal(typeof payload.asset_base_url, "string");
  assert.equal(Array.isArray(payload.allowed_origins), true);
  assert.equal(typeof payload.expires_at, "string");
  const scriptUrl = new URL(payload.script_url);
  const stylesheetUrl = new URL(payload.stylesheet_url);
  assert.equal(scriptUrl.pathname, `${widgetAssetBase}/sdk.js`);
  assert.equal(stylesheetUrl.pathname, `${widgetAssetBase}/sdk.css`);
  assert.equal(scriptUrl.searchParams.has("v"), true);
  assert.equal(stylesheetUrl.searchParams.has("v"), true);
  assert.match(payload.script_integrity, /^sha384-/);
  assert.match(payload.stylesheet_integrity, /^sha384-/);
  assert.equal(payload.widget_version_policy, "immutable");

  await app.close();
});

test("GET /v1/legacy/widget/config keeps legacy phase_0_5_canary_enabled global on/off behavior when percentage override is unset", async () => {
  process.env.WIDGET_FEATURE_FLAGS = JSON.stringify({
    phase_0_5_canary_enabled: true,
  });

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      "x-anonymous-user-id": "legacy-user",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().feature_flags.phase_0_5_canary_enabled, true);

  await app.close();
});

test("GET /v1/legacy/widget/config deterministically samples phase_0_5_canary_enabled by requester", async () => {
  process.env.WIDGET_PHASE_0_5_CANARY_PERCENTAGE = "5";
  const enabledAudienceId = findPhase05CanaryAudienceId(5, true);
  const disabledAudienceId = findPhase05CanaryAudienceId(5, false);
  const app = buildServer();

  const enabledResponse = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      origin: "https://shop.example",
      "user-agent": "widget-test/1.0",
      "x-anonymous-user-id": enabledAudienceId,
    },
  });

  const repeatedEnabledResponse = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      origin: "https://shop.example",
      "user-agent": "widget-test/1.0",
      "x-anonymous-user-id": enabledAudienceId,
    },
  });

  const disabledResponse = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      origin: "https://shop.example",
      "user-agent": "widget-test/1.0",
      "x-anonymous-user-id": disabledAudienceId,
    },
  });

  assert.equal(enabledResponse.statusCode, 200);
  assert.equal(repeatedEnabledResponse.statusCode, 200);
  assert.equal(disabledResponse.statusCode, 200);
  assert.equal(enabledResponse.json().feature_flags.phase_0_5_canary_enabled, true);
  assert.equal(repeatedEnabledResponse.json().feature_flags.phase_0_5_canary_enabled, true);
  assert.equal(disabledResponse.json().feature_flags.phase_0_5_canary_enabled, false);

  await app.close();
});

test("GET /v1/legacy/widget/config kill switch forces phase_0_5_canary_enabled off even at 100 percent", async () => {
  process.env.WIDGET_FEATURE_FLAGS = JSON.stringify({
    phase_0_5_canary_enabled: true,
    phase_0_5_kill_switch: true,
  });
  process.env.WIDGET_PHASE_0_5_CANARY_PERCENTAGE = "100";

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      origin: "https://shop.example",
      "x-anonymous-user-id": "kill-switch-user",
    },
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.feature_flags.phase_0_5_kill_switch, true);
  assert.equal(payload.feature_flags.phase_0_5_canary_enabled, false);

  await app.close();
});

test("GET /legacy/widget/sdk.js and /legacy/widget/sdk.css are served by the API and align with config SRI", async () => {
  const app = buildServer();

  const [configResponse, scriptResponse, stylesheetResponse] = await Promise.all([
    app.inject({
      method: "GET",
      url: `${widgetApiBase}/config?tenant_id=tenant-a&product_id=sku-123`,
    }),
    app.inject({
      method: "GET",
      url: `${widgetAssetBase}/sdk.js`,
    }),
    app.inject({
      method: "GET",
      url: `${widgetAssetBase}/sdk.css`,
    }),
  ]);

  assert.equal(configResponse.statusCode, 200);
  assert.equal(scriptResponse.statusCode, 200);
  assert.equal(stylesheetResponse.statusCode, 200);
  assert.match(String(scriptResponse.headers["content-type"] ?? ""), /application\/javascript/);
  assert.match(String(stylesheetResponse.headers["content-type"] ?? ""), /text\/css/);
  assert.match(scriptResponse.body, /FreeStyleWidget/);
  assert.match(scriptResponse.body, /\/legacy\/widget\/frame\?tenant_id=/);
  assert.match(scriptResponse.body, /Widget events endpoint must remain on the widget API origin\./);
  assert.doesNotMatch(scriptResponse.body, /srcdoc/);
  assert.match(stylesheetResponse.body, /freestyle-widget-root/);

  const config = configResponse.json();
  assert.equal(new URL(config.script_url).pathname, `${widgetAssetBase}/sdk.js`);
  assert.equal(new URL(config.stylesheet_url).pathname, `${widgetAssetBase}/sdk.css`);
  assert.equal(config.script_integrity, buildSri(scriptResponse.body));
  assert.equal(config.stylesheet_integrity, buildSri(stylesheetResponse.body));
  assert.equal(String(scriptResponse.headers["x-widget-integrity"]), config.script_integrity);
  assert.equal(String(stylesheetResponse.headers["x-widget-integrity"]), config.stylesheet_integrity);

  await app.close();
});

test("GET /legacy/widget/frame serves iframe bootstrap HTML", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: `${widgetAssetBase}/frame?tenant_id=tenant-a&product_id=sku-123`,
  });

  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers["content-type"] ?? ""), /text\/html/);
  assert.match(response.body, /widget\.ready/);
  assert.match(response.body, /sku-123/);
  assert.match(response.body, /}, "\*"\);/);

  await app.close();
});

test("GET /legacy/widget/frame emits CSP with request-scoped frame ancestors for allowed host patterns", async () => {
  process.env.WIDGET_ALLOWED_ORIGIN_PATTERNS = "https://*.shop.example";
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: `${widgetAssetBase}/frame?tenant_id=tenant-a&product_id=sku-123`,
    headers: {
      referer: "https://embed.shop.example/products/sku-123",
    },
  });

  assert.equal(response.statusCode, 200);
  const csp = String(response.headers["content-security-policy"] ?? "");
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /sandbox allow-scripts allow-same-origin/);
  assert.match(csp, /frame-ancestors 'self' https:\/\/embed\.shop\.example/);
  assert.equal(csp.includes("https://*.shop.example"), false);
  assert.equal(String(response.headers["referrer-policy"] ?? ""), "no-referrer");
  assert.equal(String(response.headers["x-content-type-options"] ?? ""), "nosniff");

  await app.close();
});

test("POST /v1/legacy/widget/events partially accepts valid events and dedupes by idempotency key", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: `${widgetApiBase}/events`,
    headers: {
      origin: "https://widget.example",
    },
    payload: {
      tenant_id: "tenant-a",
      product_id: "sku-123",
      events: [
        {
          event_id: "evt_1",
          event_name: "widget_loaded",
          tenant_id: "tenant-a",
          product_id: "sku-123",
          idempotency_key: "idem-1",
        },
        {
          event_id: "evt_2",
          event_name: "",
          tenant_id: "tenant-a",
          product_id: "sku-123",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 202);
  const payload = response.json();
  assert.equal(payload.accepted_count, 1);
  assert.equal(payload.duplicate_count, 0);
  assert.equal(payload.rejected_count, 1);
  assert.deepEqual(payload.accepted, [{ event_id: "evt_1", status: "accepted" }]);
  assert.equal(payload.rejected[0]?.code, "WIDGET_EVENT_INVALID");

  const duplicateResponse = await app.inject({
    method: "POST",
    url: `${widgetApiBase}/events`,
    headers: {
      origin: "https://widget.example",
    },
    payload: {
      tenant_id: "tenant-a",
      product_id: "sku-123",
      events: [
        {
          event_id: "evt_1_repeat",
          event_name: "widget_loaded",
          tenant_id: "tenant-a",
          product_id: "sku-123",
          idempotency_key: "idem-1",
        },
      ],
    },
  });

  assert.equal(duplicateResponse.statusCode, 202);
  const duplicatePayload = duplicateResponse.json();
  assert.equal(duplicatePayload.accepted_count, 0);
  assert.equal(duplicatePayload.duplicate_count, 1);
  assert.deepEqual(duplicatePayload.accepted, [{ event_id: "evt_1_repeat", status: "duplicate" }]);

  await app.close();
});

test("POST /v1/legacy/widget/events denies disallowed origins", async () => {
  process.env.CORS_ORIGIN = "https://allowed.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: `${widgetApiBase}/events`,
    headers: {
      origin: "https://denied.example",
    },
    payload: {
      tenant_id: "tenant-a",
      product_id: "sku-123",
      events: [
        {
          event_id: "evt_denied",
          event_name: "widget_loaded",
          tenant_id: "tenant-a",
          product_id: "sku-123",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), {
    error: "WIDGET_ORIGIN_DENIED",
    message: "Widget origin is not allowed.",
  });

  await app.close();
});

test("POST /v1/legacy/widget/events rejects tenant mismatch events", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: `${widgetApiBase}/events`,
    headers: {
      origin: "https://widget.example",
    },
    payload: {
      tenant_id: "tenant-a",
      product_id: "sku-123",
      events: [
        {
          event_id: "evt_tenant_mismatch",
          event_name: "widget_loaded",
          tenant_id: "tenant-b",
          product_id: "sku-123",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 400);
  const payload = response.json();
  assert.equal(payload.accepted_count, 0);
  assert.equal(payload.rejected_count, 1);
  assert.equal(payload.rejected[0]?.code, "WIDGET_EVENT_INVALID");
  assert.match(payload.rejected[0]?.message ?? "", /tenant_id|product_id/);

  await app.close();
});

test("POST /v1/legacy/widget/events rejects stale occurred_at values outside the replay window", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const staleOccurredAt = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString();
  const response = await app.inject({
    method: "POST",
    url: `${widgetApiBase}/events`,
    headers: {
      origin: "https://widget.example",
    },
    payload: {
      tenant_id: "tenant-a",
      product_id: "sku-123",
      events: [
        {
          event_id: "evt_stale",
          event_name: "widget_loaded",
          tenant_id: "tenant-a",
          product_id: "sku-123",
          occurred_at: staleOccurredAt,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 400);
  const payload = response.json();
  assert.equal(payload.accepted_count, 0);
  assert.equal(payload.rejected_count, 1);
  assert.equal(payload.rejected[0]?.code, "WIDGET_EVENT_INVALID");
  assert.match(payload.rejected[0]?.message ?? "", /replay window/i);

  await app.close();
});

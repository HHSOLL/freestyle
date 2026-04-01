import test from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../main.js";
import { __widgetRouteTestUtils } from "./widget.routes.js";

test.beforeEach(() => {
  __widgetRouteTestUtils.reset();
  delete process.env.CORS_ORIGIN;
  delete process.env.CORS_ORIGIN_PATTERNS;
  delete process.env.WIDGET_ALLOWED_ORIGINS;
  delete process.env.WIDGET_ALLOWED_ORIGIN_PATTERNS;
  delete process.env.WIDGET_CONFIG_DISABLED;
  delete process.env.API_PUBLIC_ORIGIN;
  delete process.env.WIDGET_SCRIPT_INTEGRITY;
  delete process.env.WIDGET_STYLESHEET_INTEGRITY;
  delete process.env.WIDGET_VERSION_POLICY;
});

test("GET /v1/widget/config returns widget bootstrap config", async () => {
  process.env.WIDGET_SCRIPT_INTEGRITY = "sha384-script";
  process.env.WIDGET_STYLESHEET_INTEGRITY = "sha384-style";
  process.env.WIDGET_VERSION_POLICY = "immutable";
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/v1/widget/config?tenant_id=tenant-a&product_id=sku-123",
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.widget_id, "freestyle-widget");
  assert.equal(payload.tenant_id, "tenant-a");
  assert.equal(payload.product_id, "sku-123");
  assert.equal(payload.events_endpoint, "/v1/widget/events");
  assert.equal(payload.partial_accept, true);
  assert.equal(payload.dedupe_window_seconds, 86400);
  assert.equal(typeof payload.asset_base_url, "string");
  assert.equal(Array.isArray(payload.allowed_origins), true);
  assert.equal(typeof payload.expires_at, "string");
  assert.equal(payload.script_integrity, "sha384-script");
  assert.equal(payload.stylesheet_integrity, "sha384-style");
  assert.equal(payload.widget_version_policy, "immutable");

  await app.close();
});

test("POST /v1/widget/events partially accepts valid events and dedupes by idempotency key", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/widget/events",
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
    url: "/v1/widget/events",
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

test("POST /v1/widget/events denies disallowed origins", async () => {
  process.env.CORS_ORIGIN = "https://allowed.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/widget/events",
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

test("POST /v1/widget/events rejects tenant mismatch events", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/widget/events",
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

test("POST /v1/widget/events rejects stale occurred_at values outside the replay window", async () => {
  process.env.CORS_ORIGIN = "https://widget.example";
  const app = buildServer();

  const staleOccurredAt = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString();
  const response = await app.inject({
    method: "POST",
    url: "/v1/widget/events",
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

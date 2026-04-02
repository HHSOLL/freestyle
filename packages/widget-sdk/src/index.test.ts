import assert from "node:assert/strict";
import test from "node:test";
import { createWidgetClient, type WidgetSdkError } from "./index.js";

type TestEnvironment = {
  listener: ((event: MessageEvent) => void) | null;
  iframeWindow: object;
  iframeSrc: string;
  iframeReferrerPolicy: string;
  iframeRemoved: boolean;
  fetchCalls: string[];
  onErrorCalls: WidgetSdkError[];
  restore: () => void;
};

const createTestEnvironment = (configOverrides: Partial<Record<string, unknown>> = {}): TestEnvironment => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const originalAddEventListener = globalThis.addEventListener;
  const originalRemoveEventListener = globalThis.removeEventListener;

  const iframeWindow = {};
  const fetchCalls: string[] = [];
  let iframeSrc = "";
  let iframeReferrerPolicy = "";
  let iframeRemoved = false;
  const mountTarget = {
    appendChild() {
      return undefined;
    },
  };
  let listener: ((event: MessageEvent) => void) | null = null;
  const onErrorCalls: WidgetSdkError[] = [];

  globalThis.document = {
    querySelector(selector: string) {
      return selector === "#mount" ? mountTarget : null;
    },
    createElement(tagName: string) {
      if (tagName !== "iframe") {
        throw new Error(`Unexpected element request: ${tagName}`);
      }

      return {
        contentWindow: iframeWindow,
        get src() {
          return iframeSrc;
        },
        set src(nextSrc: string) {
          iframeSrc = nextSrc;
        },
        title: "",
        sandbox: "",
        get referrerPolicy() {
          return iframeReferrerPolicy;
        },
        set referrerPolicy(nextValue: string) {
          iframeReferrerPolicy = nextValue;
        },
        style: {},
        remove() {
          iframeRemoved = true;
        },
      };
    },
  } as unknown as Document;

  globalThis.fetch = (async (input) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(requestUrl);

    if (requestUrl.includes("/widget/config")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          widget_id: "freestyle-widget",
          tenant_id: "tenant-a",
          product_id: "sku-123",
          api_base_url: "https://widget.example/v1",
          events_endpoint: "/v1/widget/events",
          script_url: "https://widget.example/widget/sdk.js",
          stylesheet_url: "https://widget.example/widget/sdk.css",
          asset_base_url: "https://widget.example/assets",
          widget_version_policy: "immutable",
          allowed_origins: ["https://shop.example"],
          feature_flags: {},
          theme: { mode: "auto", accent: "#D1B278" },
          expires_at: "2026-04-02T00:00:00.000Z",
          dedupe_window_seconds: 86400,
          partial_accept: true,
          rate_limit: { max_events: 60, window_seconds: 60 },
          error_codes: [
            "WIDGET_CONFIG_NOT_FOUND",
            "WIDGET_ORIGIN_DENIED",
            "WIDGET_EVENT_INVALID",
            "WIDGET_EVENT_RATE_LIMITED",
            "WIDGET_MOUNT_FAILED",
            "WIDGET_ASSET_LOAD_FAILED",
          ],
          ...configOverrides,
        }),
      } as Response;
    }

    return {
      ok: true,
      status: 202,
      json: async () => ({
        request_id: "req_1",
        received_count: 1,
        accepted_count: 1,
        duplicate_count: 0,
        rejected_count: 0,
        accepted: [{ event_id: "evt_1", status: "accepted" }],
        rejected: [],
      }),
    } as Response;
  }) as typeof fetch;

  globalThis.addEventListener = ((type: string, handler: EventListenerOrEventListenerObject) => {
    if (type === "message" && typeof handler === "function") {
      listener = handler as (event: MessageEvent) => void;
    }
  }) as typeof globalThis.addEventListener;

  globalThis.removeEventListener = ((type: string, handler: EventListenerOrEventListenerObject) => {
    if (type === "message" && handler === listener) {
      listener = null;
    }
  }) as typeof globalThis.removeEventListener;

  return {
    get listener() {
      return listener;
    },
    iframeWindow,
    get iframeSrc() {
      return iframeSrc;
    },
    get iframeReferrerPolicy() {
      return iframeReferrerPolicy;
    },
    get iframeRemoved() {
      return iframeRemoved;
    },
    fetchCalls,
    onErrorCalls,
    restore() {
      globalThis.document = originalDocument;
      globalThis.fetch = originalFetch;
      globalThis.addEventListener = originalAddEventListener;
      globalThis.removeEventListener = originalRemoveEventListener;
    },
  };
};

test("script mode resolves config and events URLs against API origins", async () => {
  const env = createTestEnvironment();
  try {
    const client = createWidgetClient();
    const handle = await client.init({
      mount: "#mount",
      tenantId: "tenant-a",
      productId: "sku-123",
      apiBaseUrl: "https://api.freestyle.test/v1",
      mode: "script",
    });

    await handle.track({
      event_id: "evt_1",
      event_name: "widget_loaded",
      tenant_id: "tenant-a",
      product_id: "sku-123",
    });

    assert.equal(
      env.fetchCalls[0],
      "https://api.freestyle.test/v1/widget/config?tenant_id=tenant-a&product_id=sku-123",
    );
    assert.equal(env.fetchCalls[1], "https://widget.example/v1/widget/events");
    handle.destroy();
  } finally {
    env.restore();
  }
});

test("iframe mode reports denied origin only for messages coming from the mounted iframe", async () => {
  const env = createTestEnvironment();
  try {
    const client = createWidgetClient();
    const handle = await client.init({
      mount: "#mount",
      tenantId: "tenant-a",
      productId: "sku-123",
      mode: "iframe",
      onError(error) {
        env.onErrorCalls.push(error);
      },
    });

    assert.ok(env.listener);
    assert.equal(
      env.iframeSrc,
      "https://widget.example/widget/frame?tenant_id=tenant-a&product_id=sku-123",
    );
    assert.equal(env.iframeReferrerPolicy, "no-referrer");

    env.listener?.({
      origin: "https://attacker.example",
      source: env.iframeWindow,
      data: {
        type: "widget.ready",
        version: "1",
        eventId: "evt_1",
        payload: {},
      },
    } as MessageEvent);

    assert.equal(env.onErrorCalls.length, 1);
    assert.equal(env.onErrorCalls[0]?.code, "WIDGET_ORIGIN_DENIED");
    handle.destroy();
  } finally {
    env.restore();
  }
});

test("script mode rejects cross-origin events endpoints from config before sending telemetry", async () => {
  const env = createTestEnvironment({
    events_endpoint: "https://attacker.example/v1/widget/events",
  });
  try {
    const client = createWidgetClient();
    const handle = await client.init({
      mount: "#mount",
      tenantId: "tenant-a",
      productId: "sku-123",
      mode: "script",
    });

    await assert.rejects(
      () =>
        handle.track({
          event_id: "evt_cross_origin",
          event_name: "widget_loaded",
          tenant_id: "tenant-a",
          product_id: "sku-123",
        }),
      (error: unknown) => {
        assert.equal((error as WidgetSdkError).code, "WIDGET_ORIGIN_DENIED");
        assert.match((error as WidgetSdkError).message, /events endpoint must remain on the widget API origin/i);
        return true;
      },
    );

    assert.equal(env.fetchCalls.length, 1);
  } finally {
    env.restore();
  }
});

test("iframe mode reports malformed messages only after origin validation succeeds", async () => {
  const env = createTestEnvironment();
  try {
    const client = createWidgetClient();
    const handle = await client.init({
      mount: "#mount",
      tenantId: "tenant-a",
      productId: "sku-123",
      mode: "iframe",
      onError(error) {
        env.onErrorCalls.push(error);
      },
    });

    assert.ok(env.listener);

    env.listener?.({
      origin: "https://widget.example",
      source: env.iframeWindow,
      data: {
        version: "1",
        payload: {},
      },
    } as MessageEvent);

    assert.equal(env.onErrorCalls.length, 1);
    assert.equal(env.onErrorCalls[0]?.code, "WIDGET_EVENT_INVALID");
    handle.destroy();
  } finally {
    env.restore();
  }
});

test("iframe mode ignores valid messages and unrelated sources safely", async () => {
  const env = createTestEnvironment();
  try {
    const client = createWidgetClient();
    const handle = await client.init({
      mount: "#mount",
      tenantId: "tenant-a",
      productId: "sku-123",
      mode: "iframe",
      onError(error) {
        env.onErrorCalls.push(error);
      },
    });

    assert.ok(env.listener);

    env.listener?.({
      origin: "https://ignored.example",
      source: {},
      data: {
        type: "widget.ready",
        version: "1",
        eventId: "evt_ignored",
        payload: {},
      },
    } as MessageEvent);

    env.listener?.({
      origin: "https://widget.example",
      source: env.iframeWindow,
      data: {
        type: "widget.ready",
        version: "1",
        eventId: "evt_ok",
        payload: {},
      },
    } as MessageEvent);

    assert.equal(env.onErrorCalls.length, 0);
    handle.destroy();
    assert.equal(env.listener, null);
    assert.equal(env.iframeRemoved, true);
  } finally {
    env.restore();
  }
});

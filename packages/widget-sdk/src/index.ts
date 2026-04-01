import type {
  WidgetConfig,
  WidgetErrorCode,
  WidgetEventInput,
  WidgetEventsResponse,
} from "../../contracts/src/index.js";

export type WidgetMode = "script" | "iframe";

export type WidgetInitOptions = {
  mount: string;
  tenantId: string;
  productId: string;
  mode?: WidgetMode;
  locale?: string;
  theme?: "light" | "dark" | "auto";
  debug?: boolean;
  initialState?: Record<string, unknown>;
  onEvent?: (event: WidgetEventInput) => void;
  onError?: (error: WidgetSdkError) => void;
};

export type WidgetSdkError = {
  code: WidgetErrorCode;
  message: string;
  recoverable: boolean;
  cause?: unknown;
};

export type WidgetTrackInput = WidgetEventInput | WidgetEventInput[];

export type WidgetMountHandle = {
  config: WidgetConfig;
  destroy: () => void;
  track: (events: WidgetTrackInput) => Promise<WidgetEventsResponse>;
};

export type WidgetBootstrapResult = {
  config: WidgetConfig;
  handle: WidgetMountHandle;
};

const toError = (code: WidgetErrorCode, message: string, cause?: unknown): WidgetSdkError => ({
  code,
  message,
  recoverable: true,
  cause,
});

const ensureMountTarget = (mount: string) => {
  const doc = (globalThis as { document?: { querySelector: (selector: string) => unknown } }).document;
  if (!doc?.querySelector) {
    throw toError("WIDGET_MOUNT_FAILED", "Document is not available for widget mount.");
  }
  const target = doc.querySelector(mount);
  if (!target) {
    throw toError("WIDGET_MOUNT_FAILED", `Mount target not found: ${mount}`);
  }
  return target;
};

const fetchConfig = async (options: WidgetInitOptions): Promise<WidgetConfig> => {
  const endpoint = `/v1/widget/config?tenant_id=${encodeURIComponent(options.tenantId)}&product_id=${encodeURIComponent(options.productId)}`;
  const response = await fetch(endpoint, { method: "GET" });
  if (!response.ok) {
    throw toError("WIDGET_CONFIG_NOT_FOUND", "Failed to fetch widget config.");
  }
  return (await response.json()) as WidgetConfig;
};

const asArray = (events: WidgetTrackInput) => (Array.isArray(events) ? events : [events]);

const postEvents = async (config: WidgetConfig, events: WidgetTrackInput): Promise<WidgetEventsResponse> => {
  const response = await fetch(config.events_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: config.tenant_id,
      product_id: config.product_id,
      events: asArray(events),
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw toError("WIDGET_EVENT_INVALID", "Failed to deliver widget events.");
  }

  return (await response.json()) as WidgetEventsResponse;
};

const setupIframeMode = (config: WidgetConfig, mountTarget: unknown) => {
  const doc = (globalThis as { document?: { createElement: (tagName: string) => unknown } }).document;
  if (!doc?.createElement) {
    throw toError("WIDGET_MOUNT_FAILED", "Document is not available for iframe mode.");
  }

  const iframe = doc.createElement("iframe") as {
    src: string;
    title: string;
    sandbox?: string;
    style?: { width?: string; minHeight?: string; border?: string };
  };
  iframe.src = config.script_url;
  iframe.title = "FreeStyle Widget";
  iframe.sandbox = "allow-scripts allow-same-origin";
  iframe.style = {
    width: "100%",
    minHeight: "560px",
    border: "0",
  };

  const target = mountTarget as { appendChild?: (child: unknown) => void };
  target.appendChild?.(iframe);

  const expectedOrigin = new URL(config.api_base_url).origin;
  const listener = (event: MessageEvent) => {
    // Origin trust must use runtime event.origin, never payload fields.
    if (event.origin !== expectedOrigin) return;
  };
  globalThis.addEventListener?.("message", listener);

  return () => {
    globalThis.removeEventListener?.("message", listener);
  };
};

export const createWidgetClient = () => ({
  async init(options: WidgetInitOptions): Promise<WidgetMountHandle> {
    const mode: WidgetMode = options.mode ?? "script";
    const mountTarget = ensureMountTarget(options.mount);
    const config = await fetchConfig(options);
    let cleanup = () => {};

    if (mode === "iframe") {
      cleanup = setupIframeMode(config, mountTarget);
    }

    return {
      config,
      async track(events: WidgetTrackInput) {
        const payloadEvents = asArray(events);
        payloadEvents.forEach((event) => options.onEvent?.(event));
        return postEvents(config, payloadEvents);
      },
      destroy() {
        cleanup();
      },
    };
  },
});

type FreeStyleWidgetGlobal = {
  init: (options: WidgetInitOptions) => Promise<WidgetMountHandle>;
};

const attachGlobal = () => {
  const client = createWidgetClient();
  const globalWidget: FreeStyleWidgetGlobal = {
    init: (options) => client.init(options),
  };

  (globalThis as { FreeStyleWidget?: FreeStyleWidgetGlobal }).FreeStyleWidget = globalWidget;
  const maybeWindow = globalThis as unknown as { window?: { FreeStyleWidget?: FreeStyleWidgetGlobal } };
  if (maybeWindow.window) {
    maybeWindow.window.FreeStyleWidget = globalWidget;
  }
};

attachGlobal();

declare global {
  var FreeStyleWidget: FreeStyleWidgetGlobal | undefined;
  interface Window {
    FreeStyleWidget?: FreeStyleWidgetGlobal;
  }
}

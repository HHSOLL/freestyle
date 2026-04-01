import type {
  WidgetConfig,
  WidgetErrorCode,
  WidgetEventInput,
  WidgetEventsResponse,
} from "../../contracts/src/index.js";
import { widgetIframeMessageSchema } from "../../contracts/src/index.js";

export type WidgetMode = "script" | "iframe";

export type WidgetInitOptions = {
  mount: string;
  tenantId: string;
  productId: string;
  apiBaseUrl?: string;
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

const reportRecoverableError = (
  onError: WidgetInitOptions["onError"] | undefined,
  code: WidgetErrorCode,
  message: string,
  cause?: unknown,
) => {
  onError?.(toError(code, message, cause));
};

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

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const buildRequestUrl = (base: string, path: string) => {
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  if (ABSOLUTE_URL_PATTERN.test(base)) {
    if (path.startsWith("/")) {
      return new URL(path, base).toString();
    }
    return new URL(path, `${trimTrailingSlash(base)}/`).toString();
  }

  if (path.startsWith("/")) {
    return path;
  }

  return `${trimTrailingSlash(base)}/${path.replace(/^\/+/, "")}`;
};

const resolveConfigBase = (options: WidgetInitOptions) => {
  const configured = options.apiBaseUrl?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  return "/v1";
};

const fetchConfig = async (options: WidgetInitOptions): Promise<WidgetConfig> => {
  const query = `tenant_id=${encodeURIComponent(options.tenantId)}&product_id=${encodeURIComponent(options.productId)}`;
  const endpoint = buildRequestUrl(resolveConfigBase(options), `widget/config?${query}`);
  const response = await fetch(endpoint, { method: "GET" });
  if (!response.ok) {
    throw toError("WIDGET_CONFIG_NOT_FOUND", "Failed to fetch widget config.");
  }
  return (await response.json()) as WidgetConfig;
};

const asArray = (events: WidgetTrackInput) => (Array.isArray(events) ? events : [events]);

const postEvents = async (config: WidgetConfig, events: WidgetTrackInput): Promise<WidgetEventsResponse> => {
  const response = await fetch(buildRequestUrl(config.api_base_url, config.events_endpoint), {
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

const setupIframeMode = (
  config: WidgetConfig,
  mountTarget: unknown,
  onError: WidgetInitOptions["onError"],
) => {
  const doc = (globalThis as { document?: { createElement: (tagName: string) => unknown } }).document;
  if (!doc?.createElement) {
    throw toError("WIDGET_MOUNT_FAILED", "Document is not available for iframe mode.");
  }

  const iframe = doc.createElement("iframe") as {
    contentWindow?: object | null;
    src: string;
    title: string;
    sandbox?: string;
    style?: { width?: string; minHeight?: string; border?: string };
  };
  iframe.src = buildRequestUrl(
    config.api_base_url,
    `/widget/frame?tenant_id=${encodeURIComponent(config.tenant_id)}&product_id=${encodeURIComponent(config.product_id)}`,
  );
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
    const iframeWindow = iframe.contentWindow;
    if (iframeWindow && event.source && event.source !== iframeWindow) {
      return;
    }

    // Origin trust must use runtime event.origin, never payload fields.
    if (event.origin !== expectedOrigin) {
      reportRecoverableError(
        onError,
        "WIDGET_ORIGIN_DENIED",
        `Rejected iframe message from unexpected origin: ${event.origin || "unknown"}`,
      );
      return;
    }

    const parsedMessage = widgetIframeMessageSchema.safeParse(event.data);
    if (!parsedMessage.success) {
      reportRecoverableError(
        onError,
        "WIDGET_EVENT_INVALID",
        "Rejected malformed iframe message.",
        parsedMessage.error.issues,
      );
      return;
    }
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
      cleanup = setupIframeMode(config, mountTarget, options.onError);
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

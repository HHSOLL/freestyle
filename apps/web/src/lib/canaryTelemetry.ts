"use client";

import { buildApiPath, isClientApiConfigured } from "@/lib/clientApi";

type CanaryWidgetConfig = {
  tenant_id: string;
  product_id: string;
  events_endpoint: string;
  feature_flags: Record<string, boolean>;
};

type CanaryWidgetEvent = {
  event_id: string;
  event_name: string;
  tenant_id: string;
  product_id: string;
  occurred_at: string;
  page_url?: string;
  referrer?: string;
  payload?: Record<string, unknown>;
};

const CANARY_RELEASE_FLAG = "phase_0_5_canary_enabled";
const CANARY_KILL_SWITCH = "phase_0_5_kill_switch";
const CANARY_TENANT_ID = "freestyle-web";
const CANARY_PRODUCT_ID = "web-runtime";

type CanaryRuntime = {
  config: CanaryWidgetConfig;
  enabled: boolean;
};

type VitalsSnapshot = {
  CLS: number | null;
  INP: number | null;
  LCP: number | null;
};

type EventTimingEntry = PerformanceEntry & {
  duration?: number;
  interactionId?: number;
};

type CanaryPayload = Record<string, unknown>;

let runtimePromise: Promise<CanaryRuntime | null> | null = null;

const createEventId = () => globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const getPageContext = () => ({
  page_url: globalThis.location?.href,
  referrer: globalThis.document?.referrer || undefined,
});

const buildEventsEndpoint = (config: CanaryWidgetConfig) =>
  /^https?:\/\//i.test(config.events_endpoint) ? config.events_endpoint : buildApiPath(config.events_endpoint);

const isCanaryEnabled = (config: CanaryWidgetConfig) =>
  config.feature_flags[CANARY_RELEASE_FLAG] === true && config.feature_flags[CANARY_KILL_SWITCH] !== true;

const loadCanaryRuntime = async (): Promise<CanaryRuntime | null> => {
  if (!isClientApiConfigured) {
    return null;
  }

  const query = new URLSearchParams({
    tenant_id: CANARY_TENANT_ID,
    product_id: CANARY_PRODUCT_ID,
  });
  const response = await fetch(buildApiPath(`/v1/widget/config?${query.toString()}`), {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  const config = (await response.json()) as CanaryWidgetConfig;
  return {
    config,
    enabled: isCanaryEnabled(config),
  };
};

const getRuntime = async () => {
  runtimePromise ??= loadCanaryRuntime().catch(() => null);
  return runtimePromise;
};

const postTelemetryEvent = async (
  runtime: CanaryRuntime | null,
  eventName: string,
  payload: Record<string, unknown>,
) => {
  if (!runtime?.enabled) {
    return;
  }

  const event: CanaryWidgetEvent = {
    event_id: createEventId(),
    event_name: eventName,
    tenant_id: runtime.config.tenant_id,
    product_id: runtime.config.product_id,
    occurred_at: new Date().toISOString(),
    ...getPageContext(),
    payload,
  };

  await fetch(buildEventsEndpoint(runtime.config), {
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tenant_id: runtime.config.tenant_id,
      product_id: runtime.config.product_id,
      events: [event],
    }),
  }).catch(() => undefined);
};

const observeVitals = (emit: (name: string, payload: Record<string, unknown>) => void) => {
  const snapshot: VitalsSnapshot = {
    CLS: null,
    INP: null,
    LCP: null,
  };
  const sent = new Set<string>();
  const cleanups: Array<() => void> = [];

  const sendMetric = (metric: keyof VitalsSnapshot) => {
    const value = snapshot[metric];
    if (value === null || sent.has(metric)) {
      return;
    }

    sent.add(metric);
    emit("web_vital", {
      metric,
      value: Number(value.toFixed(metric === "CLS" ? 4 : 0)),
      route: globalThis.location?.pathname || "/",
    });
  };

  const flush = () => {
    sendMetric("LCP");
    sendMetric("CLS");
    sendMetric("INP");
  };

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries.at(-1);
      if (lastEntry) {
        snapshot.LCP = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    cleanups.push(() => lcpObserver.disconnect());
  } catch {
    // Unsupported browser; skip LCP capture.
  }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) {
          snapshot.CLS = (snapshot.CLS ?? 0) + (entry.value ?? 0);
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    cleanups.push(() => clsObserver.disconnect());
  } catch {
    // Unsupported browser; skip CLS capture.
  }

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTimingEntry[]) {
        if ((entry.interactionId ?? 0) > 0) {
          snapshot.INP = Math.max(snapshot.INP ?? 0, entry.duration ?? 0);
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    cleanups.push(() => inpObserver.disconnect());
  } catch {
    // Unsupported browser; skip INP capture.
  }

  const handleVisibility = () => {
    if (globalThis.document.visibilityState === "hidden") {
      flush();
    }
  };

  globalThis.document.addEventListener("visibilitychange", handleVisibility);
  globalThis.addEventListener("pagehide", flush);
  cleanups.push(() => globalThis.document.removeEventListener("visibilitychange", handleVisibility));
  cleanups.push(() => globalThis.removeEventListener("pagehide", flush));

  const timeoutId = globalThis.setTimeout(flush, 10_000);
  cleanups.push(() => globalThis.clearTimeout(timeoutId));

  return () => {
    flush();
    cleanups.forEach((cleanup) => cleanup());
  };
};

const observeErrors = (emit: (name: string, payload: Record<string, unknown>) => void) => {
  let errorCount = 0;
  const maxErrorsPerPage = 20;

  const trackError = (payload: Record<string, unknown>) => {
    if (errorCount >= maxErrorsPerPage) {
      return;
    }
    errorCount += 1;
    emit("js_error", {
      count: errorCount,
      route: globalThis.location?.pathname || "/",
      ...payload,
    });
  };

  const handleError = (event: ErrorEvent) => {
    trackError({
      kind: "error",
      message: event.message,
      filename: event.filename || undefined,
      lineno: event.lineno || undefined,
      colno: event.colno || undefined,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason =
      typeof event.reason === "string"
        ? event.reason
        : event.reason instanceof Error
          ? event.reason.message
          : "Unhandled promise rejection";
    trackError({
      kind: "unhandledrejection",
      message: reason,
    });
  };

  globalThis.addEventListener("error", handleError);
  globalThis.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    globalThis.removeEventListener("error", handleError);
    globalThis.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
};

export const startCanaryTelemetry = () => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let stopped = false;
  const cleanups: Array<() => void> = [];

  const emit = (eventName: string, payload: Record<string, unknown>) => {
    void getRuntime().then((runtime) => {
      if (stopped) {
        return;
      }
      return postTelemetryEvent(runtime, eventName, payload);
    });
  };

  cleanups.push(observeVitals(emit));
  cleanups.push(observeErrors(emit));

  return () => {
    stopped = true;
    cleanups.forEach((cleanup) => cleanup());
  };
};

export const trackCanaryEvent = (eventName: string, payload: CanaryPayload = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  void getRuntime().then((runtime) => postTelemetryEvent(runtime, eventName, payload));
};

export const trackAddToCartConversion = (payload: CanaryPayload = {}) => {
  trackCanaryEvent("add_to_cart", payload);
};

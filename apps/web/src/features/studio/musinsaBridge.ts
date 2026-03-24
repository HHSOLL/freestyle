export type MusinsaBridgeItem = {
  url: string;
  title?: string;
};

export type MusinsaBridgePayload = {
  source: "musinsa-bridge";
  originUrl: string;
  capturedAt: string;
  items: MusinsaBridgeItem[];
};

export const MUSINSA_BRIDGE_QUERY_PARAM = "musinsa_bridge";
export const MAX_MUSINSA_BRIDGE_ITEMS = 40;

const parseSerializedPayload = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    if (typeof atob !== "function" || typeof TextDecoder === "undefined") {
      return null;
    }

    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch {
      return null;
    }
  }
};

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeItem = (value: unknown): MusinsaBridgeItem | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.url !== "string" || !isHttpUrl(record.url.trim())) return null;

  const normalized: MusinsaBridgeItem = {
    url: new URL(record.url.trim()).toString(),
  };

  if (typeof record.title === "string" && record.title.trim()) {
    normalized.title = record.title.trim();
  }

  return normalized;
};

export const parseMusinsaBridgePayload = (value: string): MusinsaBridgePayload | null => {
  if (!value.trim()) return null;

  try {
    const parsed = parseSerializedPayload(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;

    if (record.source !== "musinsa-bridge") return null;
    if (typeof record.originUrl !== "string" || !isHttpUrl(record.originUrl.trim())) return null;
    if (typeof record.capturedAt !== "string" || !record.capturedAt.trim()) return null;
    if (!Array.isArray(record.items)) return null;

    const items = record.items
      .map((item) => normalizeItem(item))
      .filter((item): item is MusinsaBridgeItem => Boolean(item));

    const deduped = new Map<string, MusinsaBridgeItem>();
    for (const item of items) {
      if (!deduped.has(item.url)) {
        deduped.set(item.url, item);
      }
      if (deduped.size >= MAX_MUSINSA_BRIDGE_ITEMS) {
        break;
      }
    }

    if (deduped.size === 0) return null;

    return {
      source: "musinsa-bridge",
      originUrl: new URL(record.originUrl.trim()).toString(),
      capturedAt: record.capturedAt.trim(),
      items: Array.from(deduped.values()),
    };
  } catch {
    return null;
  }
};

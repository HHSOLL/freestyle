const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
const ANONYMOUS_USER_STORAGE_KEY = "freestyle:anonymous-user-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const stripApiSuffix = (value: string) => {
  if (value.endsWith("/api")) return value.slice(0, -4);
  if (value.endsWith("/v1")) return value.slice(0, -3);
  return value;
};

const normalizePublicApiBaseUrl = (value: string | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";

  if (trimmed.startsWith("/")) {
    return stripApiSuffix(trimTrailingSlash(trimmed));
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return stripApiSuffix(trimTrailingSlash(parsed.toString()));
  } catch {
    return "";
  }
};

const publicApiBaseUrl = normalizePublicApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const serverApiBaseUrl = normalizePublicApiBaseUrl(process.env.BACKEND_ORIGIN);
export const isClientApiConfigured = publicApiBaseUrl.length > 0;
export const isServerApiConfigured = serverApiBaseUrl.length > 0 || publicApiBaseUrl.length > 0;
const publicAuthRequired = (() => {
  const value = process.env.NEXT_PUBLIC_AUTH_REQUIRED?.trim().toLowerCase() || "";
  return value === "1" || value === "true" || value === "yes" || value === "on";
})();
let accessToken: string | null = null;

export const setApiAccessToken = (token: string | null) => {
  accessToken = token?.trim() || null;
};

const getAnonymousUserId = () => {
  if (typeof window === "undefined" || publicAuthRequired) return null;

  const existing = window.localStorage.getItem(ANONYMOUS_USER_STORAGE_KEY)?.trim() || "";
  if (UUID_PATTERN.test(existing)) {
    return existing;
  }

  const nextId = window.crypto?.randomUUID?.();
  if (!nextId || !UUID_PATTERN.test(nextId)) {
    return null;
  }

  window.localStorage.setItem(ANONYMOUS_USER_STORAGE_KEY, nextId);
  return nextId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const buildApiPath = (path: string) => {
  if (ABSOLUTE_HTTP_URL_PATTERN.test(path)) {
    return path;
  }
  const rawPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedPath = rawPath.startsWith("/api/")
    ? `/v1/${rawPath.slice(5)}`
    : rawPath === "/api"
      ? "/v1"
      : rawPath;
  const baseUrl = publicApiBaseUrl || (typeof window === "undefined" ? serverApiBaseUrl : "");
  if (!baseUrl) {
    return normalizedPath;
  }
  return `${baseUrl}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }
  if (!accessToken && !headers.has("x-anonymous-user-id")) {
    const anonymousUserId = getAnonymousUserId();
    if (anonymousUserId) {
      headers.set("x-anonymous-user-id", anonymousUserId);
    }
  }

  return fetch(buildApiPath(path), {
    ...init,
    headers,
  });
};

export const apiFetchJson = async <T>(
  path: string,
  init?: RequestInit
): Promise<{ response: Response; data: T | null }> => {
  const response = await apiFetch(path, init);
  try {
    const data = (await response.json()) as T;
    return { response, data };
  } catch {
    return { response, data: null };
  }
};

export const getApiErrorMessage = (payload: unknown, fallback: string) => {
  if (!isRecord(payload)) {
    return fallback;
  }

  const errorMessage = payload.error;
  if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
    return errorMessage.trim();
  }

  const message = payload.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  return fallback;
};

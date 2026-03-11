const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const stripApiSuffix = (value: string) => (value.endsWith("/api") ? value.slice(0, -4) : value);

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const buildApiPath = (path: string) => {
  if (ABSOLUTE_HTTP_URL_PATTERN.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!publicApiBaseUrl) {
    return normalizedPath;
  }
  return `${publicApiBaseUrl}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiPath(path), init);

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

import crypto from "node:crypto";
import dns from "node:dns/promises";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";
import { detectHumanSignals, type HumanSignals } from "@/lib/humanDetection";
import { serverConfig } from "@/lib/serverConfig";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = MAX_UPLOAD_BYTES;
export const MAX_HTML_BYTES = 512 * 1024;
export const MAX_CART_HTML_BYTES = 2 * 1024 * 1024;
export const MAX_REMOVE_BG_OUTPUT_BYTES = 12 * 1024 * 1024;
export const ASSET_STORAGE_PATH = serverConfig.assetStoragePath;
const MAX_REDIRECT_HOPS = 5;
const DNS_BLOCK_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_HEADER_TIMEOUT_MS = 12_000;
const FETCH_BODY_TIMEOUT_MS = 20_000;

export type CandidateSource =
  | "direct"
  | "musinsa_structured"
  | "jsonld"
  | "og"
  | "twitter"
  | "image_src"
  | "img"
  | "background";

type RemoveBackgroundResult = {
  buffer: Buffer;
  mime: string;
  removedBackground: boolean;
  warnings?: string[];
};

type RemoveBackgroundOptions = {
  crop?: boolean;
};

type ImageCandidateDraft = {
  url: string;
  source: CandidateSource;
  sourcePriority: number;
  keywordScore: number;
  discoveryIndex: number;
  preliminaryScore: number;
};

export type ResolvedImageCandidate = {
  url: string;
  source: CandidateSource;
  sourcePriority: number;
  keywordScore: number;
  discoveryIndex: number;
  preliminaryScore: number;
  finalScore: number;
  width: number;
  height: number;
  mime: string;
  buffer: ArrayBuffer;
  human: HumanSignals;
  facePenalty: number;
  scoreBreakdown: {
    sourcePriority: number;
    keyword: number;
    resolution: number;
    facePenalty: number;
  };
};

export type ResolvedImageCandidates = {
  pageUrl: string;
  title: string | null;
  candidates: ResolvedImageCandidate[];
  warnings: string[];
};

export type ResolveCandidateOptions = {
  maxCandidatesCollected?: number;
  maxCandidatesScored?: number;
};

export type CutoutQualityReason =
  | "FOREGROUND_TOO_SMALL"
  | "FOREGROUND_TOO_LARGE"
  | "BBOX_TOO_LARGE"
  | "TRIM_SIZE_TOO_SMALL"
  | null;

export type CutoutQuality = {
  pass: boolean;
  reason: CutoutQualityReason;
  alphaAreaRatio: number;
  bboxAreaRatio: number;
  nonTransparentPixels: number;
  totalPixels: number;
  bbox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type CutoutTrimOptions = {
  alphaThreshold?: number;
  minAlphaAreaRatio?: number;
  maxAlphaAreaRatio?: number;
  maxBboxAreaRatio?: number;
  minTrimSizePx?: number;
  paddingPx?: number;
};

export type PostProcessedCutout = {
  buffer: Buffer;
  mime: "image/png";
  quality: CutoutQuality;
  trimRect: {
    left: number;
    top: number;
    width: number;
    height: number;
    padding: number;
  };
  originalSize: {
    width: number;
    height: number;
  };
};

const REMOVE_BG_ENDPOINT = serverConfig.removeBgEndpoint;
const REMOVE_BG_SIZE = serverConfig.removeBgSize;
const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const PRIVATE_IP_BLOCKLIST = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

const privateAddressBlockList = new net.BlockList();
privateAddressBlockList.addSubnet("0.0.0.0", 8, "ipv4");
privateAddressBlockList.addSubnet("10.0.0.0", 8, "ipv4");
privateAddressBlockList.addSubnet("100.64.0.0", 10, "ipv4");
privateAddressBlockList.addSubnet("127.0.0.0", 8, "ipv4");
privateAddressBlockList.addSubnet("169.254.0.0", 16, "ipv4");
privateAddressBlockList.addSubnet("172.16.0.0", 12, "ipv4");
privateAddressBlockList.addSubnet("192.168.0.0", 16, "ipv4");
privateAddressBlockList.addSubnet("198.18.0.0", 15, "ipv4");
privateAddressBlockList.addAddress("::", "ipv6");
privateAddressBlockList.addAddress("::1", "ipv6");
privateAddressBlockList.addSubnet("fc00::", 7, "ipv6");
privateAddressBlockList.addSubnet("fe80::", 10, "ipv6");

const blockedDnsCache = new Map<string, number>();

const DEFAULT_MAX_CANDIDATES_COLLECTED = 200;
const DEFAULT_MAX_CANDIDATES_SCORED = 40;
const MODEL_URL_KEYWORDS = [
  "model",
  "lookbook",
  "editorial",
  "styling",
  "street",
  "person",
  "woman",
  "women",
  "man",
  "mens",
  "wearing",
  "fitpic",
  "snapshot",
  "campaign",
  "onbody",
  "착용",
  "코디",
];

const MUSINSA_MODEL_URL_KEYWORDS = [
  "/images/style/",
  "/images/snap/",
  "/images/codimap/",
  "/images/coordi/",
  "lookbook",
  "staff",
  "magazine",
];

const MUSINSA_PRODUCT_URL_KEYWORDS = [
  "/images/goods/",
  "/images/goods_img/",
  "/goods_img/",
  "product_img",
];

const PRODUCT_URL_KEYWORDS = [
  "product",
  "products",
  "item",
  "goods",
  "detail",
  "prd",
  "front",
  "main",
  "img",
  "msscdn",
];

const NEGATIVE_ASSET_KEYWORDS = ["icon", "logo", "sprite", "banner", "thumbnail", "thumb", "avatar"];

const IMG_ATTR_NAMES = [
  "src",
  "data-src",
  "data-original",
  "data-lazy",
  "data-image",
  "srcset",
  "data-srcset",
];

const isHostnameBlocked = (hostname: string) => {
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  if (hostname.includes(":")) return true;
  if (/^\[.*\]$/.test(hostname)) return true;
  return PRIVATE_IP_BLOCKLIST.some((pattern) => pattern.test(hostname));
};

const isAllowedHost = (hostname: string) => {
  if (serverConfig.allowedImageHosts.length === 0) return true;
  return serverConfig.allowedImageHosts.some((entry) => {
    if (entry.startsWith("*.")) {
      return hostname.endsWith(entry.slice(1));
    }
    return hostname === entry;
  });
};

export const assertSafeRemoteUrl = (input: string) => {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }
  if (serverConfig.isProduction && serverConfig.allowedImageHosts.length === 0) {
    throw new Error("ALLOWED_IMAGE_HOSTS must be configured in production.");
  }
  if (isHostnameBlocked(url.hostname)) {
    throw new Error("Private or local addresses are not allowed.");
  }
  if (!isAllowedHost(url.hostname)) {
    throw new Error("Host is not allowed.");
  }
  return url;
};

const isBlockedIpAddress = (address: string) => {
  const family = net.isIP(address);
  if (!family) return true;

  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) {
    const mapped = address.slice(7);
    if (net.isIP(mapped) === 4) {
      return privateAddressBlockList.check(mapped, "ipv4");
    }
  }

  return privateAddressBlockList.check(address, family === 6 ? "ipv6" : "ipv4");
};

const assertHostnameResolvesToPublicNetwork = async (hostname: string) => {
  const now = Date.now();
  const blockedUntil = blockedDnsCache.get(hostname);
  if (typeof blockedUntil === "number" && blockedUntil > now) {
    throw new Error("Host resolves to private or local network address.");
  }

  const ipFamily = net.isIP(hostname);
  if (ipFamily) {
    if (isBlockedIpAddress(hostname)) {
      blockedDnsCache.set(hostname, now + DNS_BLOCK_CACHE_TTL_MS);
      throw new Error("Host resolves to private or local network address.");
    }
    return;
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    blockedDnsCache.set(hostname, now + DNS_BLOCK_CACHE_TTL_MS);
    throw new Error("Host DNS lookup returned no addresses.");
  }

  const hasBlockedAddress = records.some((record) => isBlockedIpAddress(record.address));
  if (hasBlockedAddress) {
    blockedDnsCache.set(hostname, now + DNS_BLOCK_CACHE_TTL_MS);
    throw new Error("Host resolves to private or local network address.");
  }
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(`Request timed out after ${timeoutMs}ms.`);
  }, timeoutMs);

  let signal: AbortSignal = controller.signal;
  if (init.signal) {
    if (typeof AbortSignal.any === "function") {
      signal = AbortSignal.any([init.signal, controller.signal]);
    } else if (init.signal.aborted) {
      controller.abort(init.signal.reason);
    } else {
      init.signal.addEventListener("abort", () => controller.abort(init.signal?.reason), { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...init,
      signal,
    });
  } catch (error) {
    const isAbortError =
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError");
    if (isAbortError) {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractPageTitle = (html: string) => {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (ogTitleMatch?.[1]) {
    return ogTitleMatch[1].trim();
  }
  return null;
};

const isMusinsaProductPageUrl = (input: string) => {
  try {
    const parsed = new URL(input);
    return (
      (parsed.hostname === "musinsa.com" || parsed.hostname.endsWith(".musinsa.com")) &&
      /^\/products\/\d+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
};

const scoreMusinsaCandidateUrl = (url: string) => {
  const lower = url.toLowerCase();
  let score = 0;

  for (const token of MUSINSA_PRODUCT_URL_KEYWORDS) {
    if (lower.includes(token)) score += 60;
  }
  for (const token of MUSINSA_MODEL_URL_KEYWORDS) {
    if (lower.includes(token)) score -= 90;
  }

  if (lower.includes("thumbnail")) score -= 8;
  if (lower.includes("_60.") || lower.includes("_120.") || lower.includes("_150.")) score -= 20;
  return score;
};

const scoreCandidateKeywords = (url: string, pageUrl?: string) => {
  const lower = url.toLowerCase();
  let score = 0;

  for (const token of PRODUCT_URL_KEYWORDS) {
    if (lower.includes(token)) score += 8;
  }
  for (const token of MODEL_URL_KEYWORDS) {
    if (lower.includes(token)) score -= 24;
  }
  for (const token of NEGATIVE_ASSET_KEYWORDS) {
    if (lower.includes(token)) score -= 28;
  }

  if (lower.includes("detail_")) score += 30;
  if (lower.includes("prd_img")) score += 20;
  if (lower.includes("_big") || lower.includes("_1200") || lower.includes("_1000")) score += 12;
  if (lower.endsWith(".svg")) score -= 100;
  if (pageUrl && isMusinsaProductPageUrl(pageUrl)) {
    score += scoreMusinsaCandidateUrl(url);
  }

  return score;
};

const sourcePriorityByType: Record<CandidateSource, number> = {
  direct: 240,
  musinsa_structured: 180,
  jsonld: 130,
  og: 90,
  twitter: 70,
  image_src: 65,
  img: 55,
  background: 45,
};

const normalizeUrlCandidate = (candidate: string, baseUrl: string) => {
  if (!candidate || candidate.startsWith("javascript:") || candidate.startsWith("#")) return null;
  try {
    const resolved = new URL(decodeHtmlEntities(candidate.trim()), baseUrl);
    return assertSafeRemoteUrl(resolved.toString()).toString();
  } catch {
    return null;
  }
};

const readArrayBufferWithLimit = async (
  response: Response,
  maxBytes: number,
  timeoutMs = FETCH_BODY_TIMEOUT_MS
) => {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error("File is too large.");
  }

  if (!response.body) {
    const fallback = await withTimeout(
      response.arrayBuffer(),
      timeoutMs,
      `Response body timed out after ${timeoutMs}ms.`
    );
    if (fallback.byteLength > maxBytes) {
      throw new Error("File is too large.");
    }
    return fallback;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const startedAt = Date.now();

  while (true) {
    const elapsed = Date.now() - startedAt;
    const remainingMs = timeoutMs - elapsed;
    if (remainingMs <= 0) {
      await reader.cancel("Response body timeout.");
      throw new Error(`Response body timed out after ${timeoutMs}ms.`);
    }

    let readResult: ReadableStreamReadResult<Uint8Array>;
    try {
      readResult = await withTimeout(
        reader.read(),
        remainingMs,
        `Response body timed out after ${timeoutMs}ms.`
      );
    } catch (error) {
      await reader.cancel("Response body read failed.");
      throw error;
    }

    const { done, value } = readResult;
    if (done) break;
    if (!value || value.byteLength === 0) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel("File is too large.");
      throw new Error("File is too large.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
};

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const fetchWithSafeRedirects = async (
  inputUrl: string,
  init: RequestInit = {},
  maxHops = MAX_REDIRECT_HOPS
) => {
  let current = assertSafeRemoteUrl(inputUrl);
  await assertHostnameResolvesToPublicNetwork(current.hostname);
  let currentUrl = current.toString();

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const response = await fetchWithTimeout(
      currentUrl,
      {
        ...init,
        redirect: "manual",
      },
      FETCH_HEADER_TIMEOUT_MS
    );

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return {
        response,
        finalUrl: currentUrl,
      };
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect response is missing location header (${response.status}).`);
    }

    const nextUrl = new URL(location, currentUrl).toString();
    current = assertSafeRemoteUrl(nextUrl);
    await assertHostnameResolvesToPublicNetwork(current.hostname);
    currentUrl = current.toString();
  }

  throw new Error(`Too many redirects (>${maxHops}).`);
};

const pushJsonLdImageUrls = (value: unknown, sink: Set<string>) => {
  if (typeof value === "string") {
    sink.add(value);
    return;
  }
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) {
      pushJsonLdImageUrls(entry, sink);
    }
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") sink.add(record.url);
    if (typeof record.contentUrl === "string") sink.add(record.contentUrl);
    if (typeof record["@id"] === "string") sink.add(record["@id"]);
  }
};

const isProductTypeValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.toLowerCase().includes("product");
  }
  if (Array.isArray(value)) {
    return value.some((entry) => typeof entry === "string" && entry.toLowerCase().includes("product"));
  }
  return false;
};

const collectJsonLdProductImageUrls = (html: string) => {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;

  const walk = (node: unknown, inProduct: boolean) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item, inProduct);
      }
      return;
    }
    if (typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const currentIsProduct = inProduct || isProductTypeValue(record["@type"]);

    if (currentIsProduct && Object.prototype.hasOwnProperty.call(record, "image")) {
      pushJsonLdImageUrls(record.image, urls);
    }

    for (const value of Object.values(record)) {
      walk(value, currentIsProduct);
    }
  };

  while ((match = scriptPattern.exec(html)) !== null) {
    const jsonText = decodeHtmlEntities((match[1] || "").trim());
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      walk(parsed, false);
    } catch {
      // Ignore invalid blocks.
    }
  }

  return Array.from(urls);
};

const extractSrcSetUrls = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);

const collectMusinsaStructuredImageUrls = (html: string) => {
  const urls = new Set<string>();
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    const scriptText = decodeHtmlEntities((match[1] || "").trim());
    if (!scriptText) continue;

    const lower = scriptText.toLowerCase();
    if (!lower.includes("goods") && !lower.includes("product") && !lower.includes("musinsa")) {
      continue;
    }

    const normalizedScriptText = scriptText.replace(/\\\//g, "/");
    const urlPattern =
      /["']((?:https?:)?\/\/[^"'<>\s\\]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<>\s\\]*)?|\/[^"'<>\s\\]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<>\s\\]*)?)["']/gi;
    let urlMatch: RegExpExecArray | null;

    while ((urlMatch = urlPattern.exec(normalizedScriptText)) !== null) {
      const rawCandidate = urlMatch[1];
      if (!rawCandidate) continue;

      const candidate = rawCandidate.startsWith("//") ? `https:${rawCandidate}` : rawCandidate;
      if (!candidate) continue;

      const candidateLower = candidate.toLowerCase();
      if (
        !candidateLower.includes("musinsa") &&
        !candidateLower.includes("msscdn") &&
        !candidateLower.includes("/images/goods/") &&
        !candidateLower.includes("/images/goods_img/")
      ) {
        continue;
      }
      urls.add(candidate);
    }
  }

  return Array.from(urls);
};

const collectImageCandidatesFromHtml = (html: string, baseUrl: string) => {
  const candidates = new Map<string, ImageCandidateDraft>();
  const isMusinsaPage = isMusinsaProductPageUrl(baseUrl);
  let discoveryIndex = 0;

  const registerCandidate = (rawUrl: string, source: CandidateSource) => {
    const normalized = normalizeUrlCandidate(rawUrl, baseUrl);
    if (!normalized) return;

    const sourcePriority = sourcePriorityByType[source] ?? 0;
    const keywordScore = scoreCandidateKeywords(normalized, baseUrl);
    const existing = candidates.get(normalized);

    if (existing) {
      if (sourcePriority > existing.sourcePriority) {
        existing.source = source;
        existing.sourcePriority = sourcePriority;
      }
      existing.keywordScore = Math.max(existing.keywordScore, keywordScore);
      existing.preliminaryScore =
        existing.sourcePriority + existing.keywordScore - existing.discoveryIndex * 0.1;
      return;
    }

    const candidate: ImageCandidateDraft = {
      url: normalized,
      source,
      sourcePriority,
      keywordScore,
      discoveryIndex,
      preliminaryScore: sourcePriority + keywordScore - discoveryIndex * 0.1,
    };
    candidates.set(normalized, candidate);
    discoveryIndex += 1;
  };

  const jsonLdImages = collectJsonLdProductImageUrls(html);
  for (const imageUrl of jsonLdImages) {
    registerCandidate(imageUrl, "jsonld");
  }
  if (isMusinsaPage) {
    const structuredMusinsaImages = collectMusinsaStructuredImageUrls(html);
    for (const imageUrl of structuredMusinsaImages) {
      registerCandidate(imageUrl, "musinsa_structured");
    }
  }

  const metaPatterns: Array<{ pattern: RegExp; source: CandidateSource }> = [
    {
      pattern: /<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
      source: "og",
    },
    {
      pattern: /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
      source: "twitter",
    },
    {
      pattern: /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
      source: "image_src",
    },
  ];

  for (const { pattern, source } of metaPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) registerCandidate(match[1], source);
    }
  }

  const imgTagPattern = /<img\b[^>]*>/gi;
  let imgTagMatch: RegExpExecArray | null;
  while ((imgTagMatch = imgTagPattern.exec(html)) !== null) {
    const imgTag = imgTagMatch[0] || "";
    for (const attrName of IMG_ATTR_NAMES) {
      const attrPattern = new RegExp(`${attrName}=["']([^"']+)["']`, "gi");
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrPattern.exec(imgTag)) !== null) {
        const rawValue = attrMatch[1] || "";
        if (!rawValue) continue;
        if (attrName.includes("srcset")) {
          for (const srcsetUrl of extractSrcSetUrls(rawValue)) {
            registerCandidate(srcsetUrl, "img");
          }
        } else {
          registerCandidate(rawValue, "img");
        }
      }
    }
  }

  const bgPattern = /background-image\s*:\s*url\((['"]?)([^"')]+)\1\)/gi;
  let bgMatch: RegExpExecArray | null;
  while ((bgMatch = bgPattern.exec(html)) !== null) {
    if (bgMatch[2]) registerCandidate(bgMatch[2], "background");
  }

  return Array.from(candidates.values());
};

const scoreByResolution = (width: number, height: number) => {
  const minEdge = Math.min(width, height);
  const maxEdge = Math.max(width, height);
  const aspect = maxEdge / Math.max(1, minEdge);
  const megapixels = (width * height) / 1_000_000;

  let score = 0;
  score += Math.min(40, megapixels * 8);

  if (minEdge >= 1200) score += 18;
  else if (minEdge >= 800) score += 10;
  else if (minEdge < 300) score -= 24;

  if (aspect > 3.2) score -= 20;
  else if (aspect > 2.4) score -= 10;

  return score;
};

const defaultHumanSignals = (): HumanSignals => ({
  detector: "none",
  faceCount: 0,
  facesOverMinArea: 0,
  maxFaceAreaRatio: 0,
  elapsedMs: 0,
});

const calculateFacePenalty = (signals: HumanSignals) => {
  if (signals.facesOverMinArea <= 0) return 0;
  return (
    serverConfig.humanFacePenaltyBase + serverConfig.humanFacePenaltySlope * signals.maxFaceAreaRatio
  );
};

const mapWithConcurrency = async <T, R>(
  list: T[],
  concurrency: number,
  mapper: (entry: T, index: number) => Promise<R>
): Promise<R[]> => {
  const limit = Math.max(1, Math.min(concurrency, list.length));
  const out: R[] = new Array(list.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= list.length) return;
      out[current] = await mapper(list[current], current);
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
};

const fetchAndScoreCandidate = async (
  candidate: ImageCandidateDraft
): Promise<ResolvedImageCandidate | null> => {
  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(candidate.url, {
      headers: {
        ...DEFAULT_FETCH_HEADERS,
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const buffer = await readArrayBufferWithLimit(response, MAX_IMAGE_BYTES);
    const metadata = await sharp(Buffer.from(buffer)).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) {
      return null;
    }

    const resolutionScore = scoreByResolution(width, height);
    const finalScore = candidate.preliminaryScore + resolutionScore;

    return {
      ...candidate,
      url: finalUrl,
      finalScore,
      width,
      height,
      mime: contentType,
      buffer,
      human: defaultHumanSignals(),
      facePenalty: 0,
      scoreBreakdown: {
        sourcePriority: candidate.sourcePriority,
        keyword: candidate.keywordScore,
        resolution: resolutionScore,
        facePenalty: 0,
      },
    };
  } catch {
    return null;
  }
};

const enrichCandidatesWithHumanSignals = async (
  candidates: ResolvedImageCandidate[]
): Promise<{ candidates: ResolvedImageCandidate[]; warnings: string[] }> => {
  if (candidates.length === 0) {
    return { candidates, warnings: [] };
  }

  const warnings = new Set<string>();
  if (serverConfig.humanDetectionMode === "none") {
    return {
      candidates: candidates
        .map((candidate) => ({
          ...candidate,
          human: defaultHumanSignals(),
          facePenalty: 0,
          scoreBreakdown: {
            ...candidate.scoreBreakdown,
            facePenalty: 0,
          },
        }))
        .sort((a, b) => b.finalScore - a.finalScore),
      warnings: [],
    };
  }

  const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore);
  const detectionCount = Math.min(serverConfig.humanDetectionMaxCandidates, sorted.length);
  const detectionTargets = new Set(
    sorted
      .slice(0, detectionCount)
      .map((candidate) => `${candidate.url}::${candidate.discoveryIndex}::${candidate.source}`)
  );

  const updated = await mapWithConcurrency(candidates, 3, async (candidate) => {
    const candidateKey = `${candidate.url}::${candidate.discoveryIndex}::${candidate.source}`;
    if (!detectionTargets.has(candidateKey)) {
      return {
        ...candidate,
        human: defaultHumanSignals(),
        facePenalty: 0,
        scoreBreakdown: {
          ...candidate.scoreBreakdown,
          facePenalty: 0,
        },
      };
    }

    let humanSignals = defaultHumanSignals();
    try {
      humanSignals = await detectHumanSignals(Buffer.from(candidate.buffer), {
        mode: serverConfig.humanDetectionMode,
        maxSide: serverConfig.humanDetectionMaxSide,
        minFaceAreaRatio: serverConfig.humanFaceMinAreaRatio,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? `HUMAN_DETECTION_FAILED:${error.message}`
          : "HUMAN_DETECTION_FAILED";
      warnings.add(message);
    }

    const facePenalty = calculateFacePenalty(humanSignals);
    return {
      ...candidate,
      human: humanSignals,
      facePenalty,
      finalScore: candidate.preliminaryScore + candidate.scoreBreakdown.resolution - facePenalty,
      scoreBreakdown: {
        ...candidate.scoreBreakdown,
        facePenalty,
      },
    };
  });

  return {
    candidates: updated.sort((a, b) => b.finalScore - a.finalScore),
    warnings: Array.from(warnings),
  };
};

export const resolveProductImageCandidates = async (
  inputUrl: string,
  options?: ResolveCandidateOptions
): Promise<ResolvedImageCandidates> => {
  const pageUrl = assertSafeRemoteUrl(inputUrl);
  const maxCandidatesCollected = Math.max(
    1,
    Math.floor(options?.maxCandidatesCollected ?? DEFAULT_MAX_CANDIDATES_COLLECTED)
  );
  const maxCandidatesScored = Math.max(
    1,
    Math.floor(options?.maxCandidatesScored ?? DEFAULT_MAX_CANDIDATES_SCORED)
  );

  const { response, finalUrl } = await fetchWithSafeRedirects(pageUrl.toString(), {
    headers: {
      ...DEFAULT_FETCH_HEADERS,
      Accept: "image/*,text/html;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch the URL (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const buffer = await readArrayBufferWithLimit(response, MAX_IMAGE_BYTES);
    const metadata = await sharp(Buffer.from(buffer)).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) {
      throw new Error("Could not read image metadata.");
    }

    const directKeywordScore = scoreCandidateKeywords(finalUrl, finalUrl);
    const directResolutionScore = scoreByResolution(width, height);
    const candidate: ResolvedImageCandidate = {
      url: finalUrl,
      source: "direct",
      sourcePriority: sourcePriorityByType.direct,
      keywordScore: directKeywordScore,
      discoveryIndex: 0,
      preliminaryScore: sourcePriorityByType.direct,
      finalScore: sourcePriorityByType.direct + directResolutionScore,
      width,
      height,
      mime: contentType,
      buffer,
      human: defaultHumanSignals(),
      facePenalty: 0,
      scoreBreakdown: {
        sourcePriority: sourcePriorityByType.direct,
        keyword: directKeywordScore,
        resolution: directResolutionScore,
        facePenalty: 0,
      },
    };

    const withHumanSignals = await enrichCandidatesWithHumanSignals([candidate]);

    return {
      pageUrl: finalUrl,
      title: null,
      candidates: withHumanSignals.candidates,
      warnings: withHumanSignals.warnings,
    };
  }

  if (!contentType.includes("text/html")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const htmlBuffer = await readArrayBufferWithLimit(response, MAX_HTML_BYTES);
  const html = new TextDecoder("utf-8").decode(htmlBuffer);
  const title = extractPageTitle(html);

  const drafts = collectImageCandidatesFromHtml(html, finalUrl)
    .sort((a, b) => b.preliminaryScore - a.preliminaryScore)
    .slice(0, maxCandidatesCollected)
    .slice(0, Math.max(1, maxCandidatesScored));

  if (drafts.length === 0) {
    throw new Error("No preview image found on the page.");
  }

  const resolved = await mapWithConcurrency(drafts, 6, async (candidate) =>
    fetchAndScoreCandidate(candidate)
  );

  const candidates = resolved
    .filter((entry): entry is ResolvedImageCandidate => Boolean(entry))
    .sort((a, b) => b.finalScore - a.finalScore);

  if (candidates.length === 0) {
    throw new Error("Could not resolve any valid image candidates.");
  }

  const withHumanSignals = await enrichCandidatesWithHumanSignals(candidates);

  return {
    pageUrl: finalUrl,
    title,
    candidates: withHumanSignals.candidates,
    warnings: withHumanSignals.warnings,
  };
};

export const fetchImageFromUrl = async (inputUrl: string) => {
  const { title, candidates } = await resolveProductImageCandidates(inputUrl, {
    maxCandidatesCollected: 60,
    maxCandidatesScored: 20,
  });

  const selected = candidates[0];
  return {
    buffer: selected.buffer,
    mime: selected.mime,
    sourceUrl: selected.url,
    title,
  };
};

const looksLikeProductDetailUrl = (url: URL) => {
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  if (
    path.includes("/products/") ||
    path.includes("/product/") ||
    path.includes("/goods/") ||
    path.includes("/item/")
  ) {
    return true;
  }
  if (
    search.includes("goodsno=") ||
    search.includes("product_no=") ||
    search.includes("productid=") ||
    search.includes("itemid=")
  ) {
    return true;
  }
  return false;
};

const extractProductLinks = (html: string, baseUrl: string) => {
  const links = new Set<string>();
  const addCandidate = (candidate: string) => {
    const resolved = normalizeUrlCandidate(candidate, baseUrl);
    if (!resolved) return;
    const parsed = new URL(resolved);
    if (looksLikeProductDetailUrl(parsed)) {
      links.add(resolved);
    }
  };

  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorPattern.exec(html)) !== null) {
    addCandidate(anchorMatch[1] || "");
  }

  const absolutePattern = /https?:\/\/[^\s"'<>]+/gi;
  let absoluteMatch: RegExpExecArray | null;
  while ((absoluteMatch = absolutePattern.exec(html)) !== null) {
    addCandidate(absoluteMatch[0]);
  }

  const goodsNoPattern = /"goodsNo"\s*:\s*"(\d+)"/gi;
  let goodsMatch: RegExpExecArray | null;
  while ((goodsMatch = goodsNoPattern.exec(html)) !== null) {
    addCandidate(`/products/${goodsMatch[1]}`);
  }

  return Array.from(links);
};

export const fetchProductLinksFromCartUrl = async (inputUrl: string, maxItems = 20) => {
  const url = assertSafeRemoteUrl(inputUrl);
  const { response, finalUrl } = await fetchWithSafeRedirects(url.toString(), {
    headers: {
      ...DEFAULT_FETCH_HEADERS,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cart URL (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("Cart URL does not return an HTML page.");
  }

  const htmlBuffer = await readArrayBufferWithLimit(response, MAX_CART_HTML_BYTES);
  const html = new TextDecoder("utf-8").decode(htmlBuffer);
  const productUrls = extractProductLinks(html, finalUrl).slice(0, Math.max(1, maxItems));

  if (productUrls.length === 0) {
    throw new Error("No product links found in the cart page.");
  }

  return {
    cartUrl: finalUrl,
    productUrls,
  };
};

const parseRemoveBgError = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      return [first.title, first.detail, first.code].filter(Boolean).join(" - ");
    }
    if (typeof data?.error === "string") {
      return data.error;
    }
    if (typeof data?.error?.message === "string") {
      return data.error.message;
    }
  } catch {
    // Fall back to raw text.
  }
  return text;
};

export const removeBackground = async (
  input: ArrayBuffer | Buffer,
  mime: string,
  options?: RemoveBackgroundOptions
): Promise<RemoveBackgroundResult> => {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const apiKey = serverConfig.removeBgApiKey;
  if (!apiKey) {
    return {
      buffer: inputBuffer,
      mime,
      removedBackground: false,
      warnings: ["MISSING_API_KEY"],
    };
  }

  const formData = new FormData();
  const extension = mimeToExtension(mime);
  formData.append(
    "image_file",
    new Blob([bufferToArrayBuffer(inputBuffer)], { type: mime }),
    `asset.${extension}`
  );
  formData.append("size", REMOVE_BG_SIZE);
  if (options?.crop) {
    formData.append("crop", "true");
  }

  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const detail = await parseRemoveBgError(response);
    return {
      buffer: inputBuffer,
      mime,
      removedBackground: false,
      warnings: [`REMOVE_BG_ERROR:${detail || `HTTP ${response.status}`}`],
    };
  }

  const outBuffer = Buffer.from(await readArrayBufferWithLimit(response, MAX_REMOVE_BG_OUTPUT_BYTES));
  return { buffer: outBuffer, mime: "image/png", removedBackground: true };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const evaluatePreTrimQuality = (
  alphaAreaRatio: number,
  bboxAreaRatio: number,
  options: Required<Pick<CutoutTrimOptions, "minAlphaAreaRatio" | "maxAlphaAreaRatio" | "maxBboxAreaRatio">>
): CutoutQualityReason => {
  if (alphaAreaRatio < options.minAlphaAreaRatio) return "FOREGROUND_TOO_SMALL";
  if (alphaAreaRatio > options.maxAlphaAreaRatio) return "FOREGROUND_TOO_LARGE";
  if (bboxAreaRatio > options.maxBboxAreaRatio) return "BBOX_TOO_LARGE";
  return null;
};

const evaluateTrimDimensions = (
  trimWidth: number,
  trimHeight: number,
  options: Required<Pick<CutoutTrimOptions, "minTrimSizePx">>
): CutoutQualityReason => {
  if (trimWidth < options.minTrimSizePx || trimHeight < options.minTrimSizePx) return "TRIM_SIZE_TOO_SMALL";
  return null;
};

export const postProcessCutout = async (
  inputBuffer: Buffer,
  options?: CutoutTrimOptions
): Promise<PostProcessedCutout> => {
  const alphaThreshold = clamp(Math.floor(options?.alphaThreshold ?? 12), 0, 255);
  const qualityOptions = {
    minAlphaAreaRatio: options?.minAlphaAreaRatio ?? 0.02,
    maxAlphaAreaRatio: options?.maxAlphaAreaRatio ?? 0.9,
    maxBboxAreaRatio: options?.maxBboxAreaRatio ?? 0.96,
  };
  const trimOptions = {
    minTrimSizePx: options?.minTrimSizePx ?? 64,
  };

  const normalizedPng = await sharp(inputBuffer).ensureAlpha().png().toBuffer();
  const rawResult = await sharp(normalizedPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = rawResult.info.width;
  const height = rawResult.info.height;
  const channels = rawResult.info.channels;
  const cleaned = Buffer.from(rawResult.data);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let nonTransparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      const alpha = cleaned[idx + 3] ?? 0;
      if (alpha <= alphaThreshold) {
        cleaned[idx + 3] = 0;
        continue;
      }

      nonTransparentPixels += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (nonTransparentPixels === 0 || maxX < minX || maxY < minY) {
    throw new Error("Cutout has no foreground pixels.");
  }

  const bboxWidth = maxX - minX + 1;
  const bboxHeight = maxY - minY + 1;
  const totalPixels = width * height;
  const bboxArea = bboxWidth * bboxHeight;
  const alphaAreaRatio = nonTransparentPixels / totalPixels;
  const bboxAreaRatio = bboxArea / totalPixels;
  const preTrimReason = evaluatePreTrimQuality(alphaAreaRatio, bboxAreaRatio, qualityOptions);

  const subjectSize = Math.max(bboxWidth, bboxHeight);
  const dynamicPadding = clamp(Math.round(subjectSize * 0.02), 12, 48);
  const padding = options?.paddingPx ?? dynamicPadding;

  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);
  const trimWidth = right - left + 1;
  const trimHeight = bottom - top + 1;
  const trimReason = evaluateTrimDimensions(trimWidth, trimHeight, trimOptions);
  const reason = preTrimReason ?? trimReason;
  const quality: CutoutQuality = {
    pass: reason === null,
    reason,
    alphaAreaRatio,
    bboxAreaRatio,
    nonTransparentPixels,
    totalPixels,
    bbox: {
      left: minX,
      top: minY,
      width: bboxWidth,
      height: bboxHeight,
    },
  };

  if (preTrimReason) {
    return {
      buffer: normalizedPng,
      mime: "image/png",
      quality,
      trimRect: {
        left: 0,
        top: 0,
        width,
        height,
        padding: 0,
      },
      originalSize: {
        width,
        height,
      },
    };
  }

  if (trimReason) {
    return {
      buffer: normalizedPng,
      mime: "image/png",
      quality,
      trimRect: {
        left,
        top,
        width: trimWidth,
        height: trimHeight,
        padding,
      },
      originalSize: {
        width,
        height,
      },
    };
  }

  const cleanedPng = await sharp(cleaned, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toBuffer();

  const trimmedBuffer = await sharp(cleanedPng)
    .extract({ left, top, width: trimWidth, height: trimHeight })
    .png()
    .toBuffer();

  return {
    buffer: trimmedBuffer,
    mime: "image/png",
    quality,
    trimRect: {
      left,
      top,
      width: trimWidth,
      height: trimHeight,
      padding,
    },
    originalSize: {
      width,
      height,
    },
  };
};

export const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  Uint8Array.from(buffer).buffer;

export const ensureAssetStorageDir = async () => {
  await fs.mkdir(ASSET_STORAGE_PATH, { recursive: true });
  return ASSET_STORAGE_PATH;
};

export const createJobId = () => crypto.randomUUID();

export const mimeToExtension = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "bin";
};

export const buildAssetPath = (jobId: string, label: string, extension: string) =>
  path.join(ASSET_STORAGE_PATH, `${jobId}-${label}.${extension}`);

export const writeBufferToFile = async (buffer: Buffer, filePath: string) => {
  await ensureAssetStorageDir();
  await fs.writeFile(filePath, buffer);
  return filePath;
};

export const readFileAsDataUrl = async (filePath: string, mime: string) => {
  const buffer = await fs.readFile(filePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

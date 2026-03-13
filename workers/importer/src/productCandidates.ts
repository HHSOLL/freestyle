import dns from "node:dns/promises";
import net from "node:net";
import sharp from "sharp";

const MAX_HTML_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 5;
const DNS_BLOCK_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_HEADER_TIMEOUT_MS = 12_000;
const FETCH_BODY_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_CANDIDATES_COLLECTED = 220;
const DEFAULT_MAX_CANDIDATES_SCORED = 72;

export type CandidateSource =
  | "direct"
  | "musinsa_goods_state"
  | "musinsa_structured"
  | "jsonld"
  | "og"
  | "twitter"
  | "image_src"
  | "img"
  | "background"
  | "manual";

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
  buffer: Buffer;
};

export type CandidatePreview = {
  id: string;
  url: string;
  source: string;
  finalScore: number;
  width: number;
  height: number;
  isModelLike: boolean;
  facesOverMinArea: number;
};

export type ResolvedImageCandidates = {
  pageUrl: string;
  title: string | null;
  candidates: ResolvedImageCandidate[];
};

const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

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
  "/images/prd_img/",
  "/goods_img/",
  "detail_",
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
const IMG_ATTR_NAMES = ["src", "data-src", "data-original", "data-lazy", "data-image", "srcset", "data-srcset"];

const sourcePriorityByType: Record<CandidateSource, number> = {
  direct: 240,
  manual: 235,
  musinsa_goods_state: 230,
  musinsa_structured: 180,
  jsonld: 130,
  og: 90,
  twitter: 70,
  image_src: 65,
  img: 55,
  background: 45,
};

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

type ImageCandidateDraft = {
  url: string;
  source: CandidateSource;
  sourcePriority: number;
  keywordScore: number;
  discoveryIndex: number;
  preliminaryScore: number;
};

const readAllowedHosts = () =>
  (process.env.ALLOWED_IMAGE_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const uniqueBy = <T>(items: T[], keyOf: (item: T) => string) => {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
};

const isProduction = process.env.NODE_ENV === "production";

const isHostnameBlocked = (hostname: string) => {
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  if (hostname.includes(":")) return true;
  if (/^\[.*\]$/.test(hostname)) return true;
  return false;
};

const isAllowedHost = (hostname: string) => {
  const allowedImageHosts = readAllowedHosts();
  if (allowedImageHosts.length === 0) return true;
  return allowedImageHosts.some((entry) => {
    if (entry.startsWith("*.")) {
      return hostname.endsWith(entry.slice(1));
    }
    return hostname === entry;
  });
};

const assertSafeRemoteUrl = (input: string) => {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }
  if (isProduction && readAllowedHosts().length === 0) {
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

  if (records.some((record) => isBlockedIpAddress(record.address))) {
    blockedDnsCache.set(hostname, now + DNS_BLOCK_CACHE_TTL_MS);
    throw new Error("Host resolves to private or local network address.");
  }
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(`Request timed out after ${timeoutMs}ms.`), timeoutMs);
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
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const readArrayBufferWithLimit = async (response: Response, maxBytes: number, timeoutMs = FETCH_BODY_TIMEOUT_MS) => {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error("File is too large.");
  }

  if (!response.body) {
    const fallback = await withTimeout(response.arrayBuffer(), timeoutMs, `Response body timed out after ${timeoutMs}ms.`);
    if (fallback.byteLength > maxBytes) throw new Error("File is too large.");
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

    const { done, value } = await withTimeout(reader.read(), remainingMs, `Response body timed out after ${timeoutMs}ms.`);
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

const fetchWithSafeRedirects = async (inputUrl: string, init: RequestInit = {}, maxHops = MAX_REDIRECT_HOPS) => {
  let current = assertSafeRemoteUrl(inputUrl);
  await assertHostnameResolvesToPublicNetwork(current.hostname);
  let currentUrl = current.toString();

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const response = await fetchWithTimeout(currentUrl, { ...init, redirect: "manual" }, FETCH_HEADER_TIMEOUT_MS);
    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return { response, finalUrl: currentUrl };
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

const extractPageTitle = (html: string) => {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogTitleMatch?.[1]) return ogTitleMatch[1].trim();
  return null;
};

export const isMusinsaProductPageUrl = (input: string) => {
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
  if (lower.includes("/images/prd_img/")) score += 70;
  if (lower.includes("detail_")) score += 36;
  if (
    lower.includes("/images/brand/") ||
    lower.includes("/mfile_") ||
    lower.includes("/goodsdetail/banner/") ||
    lower.includes("/campaign_service/") ||
    lower.includes("/favicon/") ||
    lower.includes("/static/assets/")
  ) {
    score -= 140;
  }
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

const normalizeUrlCandidate = (candidate: string, baseUrl: string) => {
  if (!candidate || candidate.startsWith("javascript:") || candidate.startsWith("#")) return null;
  try {
    const normalizedCandidate = decodeHtmlEntities(candidate.trim());
    const musinsaCdnCandidate =
      isMusinsaProductPageUrl(baseUrl) && normalizedCandidate.startsWith("/images/")
        ? `https://image.msscdn.net${normalizedCandidate}`
        : normalizedCandidate;
    const resolved = new URL(musinsaCdnCandidate, baseUrl);
    return assertSafeRemoteUrl(resolved.toString()).toString();
  } catch {
    return null;
  }
};

const pushJsonLdImageUrls = (value: unknown, sink: Set<string>) => {
  if (typeof value === "string") {
    sink.add(value);
    return;
  }
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) pushJsonLdImageUrls(entry, sink);
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") sink.add(record.url);
    if (typeof record.contentUrl === "string") sink.add(record.contentUrl);
    if (typeof record["@id"] === "string") sink.add(record["@id"] as string);
  }
};

const isProductTypeValue = (value: unknown): boolean => {
  if (typeof value === "string") return value.toLowerCase().includes("product");
  if (Array.isArray(value)) return value.some((entry) => typeof entry === "string" && entry.toLowerCase().includes("product"));
  return false;
};

const collectJsonLdProductImageUrls = (html: string) => {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;

  const walk = (node: unknown, inProduct: boolean) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, inProduct);
      return;
    }
    if (typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const currentIsProduct = inProduct || isProductTypeValue(record["@type"]);
    if (currentIsProduct && Object.prototype.hasOwnProperty.call(record, "image")) {
      pushJsonLdImageUrls(record.image, urls);
    }
    for (const value of Object.values(record)) walk(value, currentIsProduct);
  };

  while ((match = scriptPattern.exec(html)) !== null) {
    const jsonText = decodeHtmlEntities((match[1] || "").trim());
    if (!jsonText) continue;
    try {
      walk(JSON.parse(jsonText) as unknown, false);
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

const isLikelyMusinsaProductImageUrl = (input: string) => {
  const lower = input.toLowerCase();
  const hasProductToken =
    lower.includes("/images/goods/") ||
    lower.includes("/images/goods_img/") ||
    lower.includes("/goods_img/") ||
    lower.includes("/images/prd_img/") ||
    lower.includes("detail_");
  if (!hasProductToken) return false;
  if (
    lower.includes("/images/brand/") ||
    lower.includes("/mfile_") ||
    lower.includes("/campaign_service/") ||
    lower.includes("/goodsdetail/banner/") ||
    lower.includes("/favicon/") ||
    lower.includes("/static/assets/")
  ) {
    return false;
  }
  return true;
};

const collectMusinsaGoodsStateImageUrls = (html: string) => {
  const urls = new Set<string>();
  const normalizedHtml = html.replace(/\\\//g, "/");
  const stateImagePattern = /"(?:thumbnailImageUrl|imageUrl)"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"]*)?)"/gi;
  let match: RegExpExecArray | null;
  while ((match = stateImagePattern.exec(normalizedHtml)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const candidate = raw.startsWith("//") ? `https:${raw}` : raw;
    if (!isLikelyMusinsaProductImageUrl(candidate)) continue;
    urls.add(candidate);
  }
  return Array.from(urls);
};

const collectMusinsaStructuredImageUrls = (html: string) => {
  const urls = new Set<string>();
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    const scriptText = decodeHtmlEntities((match[1] || "").trim());
    if (!scriptText) continue;

    const lower = scriptText.toLowerCase();
    if (!lower.includes("goods") && !lower.includes("product") && !lower.includes("musinsa")) continue;

    const normalizedScriptText = scriptText.replace(/\\\//g, "/");
    const urlPattern = /["']((?:https?:)?\/\/[^"'<>\s\\]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<>\s\\]*)?|\/[^"'<>\s\\]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<>\s\\]*)?)["']/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlPattern.exec(normalizedScriptText)) !== null) {
      const rawCandidate = urlMatch[1];
      if (!rawCandidate) continue;
      const candidate = rawCandidate.startsWith("//") ? `https:${rawCandidate}` : rawCandidate;
      const candidateLower = candidate.toLowerCase();
      if (
        !candidateLower.includes("musinsa") &&
        !candidateLower.includes("msscdn") &&
        !candidateLower.includes("/images/goods/") &&
        !candidateLower.includes("/images/goods_img/") &&
        !candidateLower.includes("/images/prd_img/")
      ) {
        continue;
      }
      if (!isLikelyMusinsaProductImageUrl(candidateLower)) continue;
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
      existing.preliminaryScore = existing.sourcePriority + existing.keywordScore - existing.discoveryIndex * 0.1;
      return;
    }

    candidates.set(normalized, {
      url: normalized,
      source,
      sourcePriority,
      keywordScore,
      discoveryIndex,
      preliminaryScore: sourcePriority + keywordScore - discoveryIndex * 0.1,
    });
    discoveryIndex += 1;
  };

  for (const imageUrl of collectJsonLdProductImageUrls(html)) registerCandidate(imageUrl, "jsonld");
  if (isMusinsaPage) {
    for (const imageUrl of collectMusinsaGoodsStateImageUrls(html)) registerCandidate(imageUrl, "musinsa_goods_state");
    for (const imageUrl of collectMusinsaStructuredImageUrls(html)) registerCandidate(imageUrl, "musinsa_structured");
  }

  const metaPatterns: Array<{ pattern: RegExp; source: CandidateSource }> = [
    { pattern: /<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi, source: "og" },
    { pattern: /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi, source: "twitter" },
    { pattern: /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/gi, source: "image_src" },
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
          for (const srcsetUrl of extractSrcSetUrls(rawValue)) registerCandidate(srcsetUrl, "img");
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

const fetchAndScoreCandidate = async (candidate: ImageCandidateDraft): Promise<ResolvedImageCandidate | null> => {
  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(candidate.url, {
      headers: {
        ...DEFAULT_FETCH_HEADERS,
        Accept: "image/*",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await readArrayBufferWithLimit(response, MAX_IMAGE_BYTES));
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) return null;

    const resolutionScore = scoreByResolution(width, height);
    return {
      ...candidate,
      url: finalUrl,
      finalScore: candidate.preliminaryScore + resolutionScore,
      width,
      height,
      mime: contentType,
      buffer,
    };
  } catch {
    return null;
  }
};

const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) => {
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const output: R[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      output[current] = await mapper(items[current], current);
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return output;
};

export const resolveProductImageCandidates = async (
  inputUrl: string,
  options?: { maxCandidatesCollected?: number; maxCandidatesScored?: number }
): Promise<ResolvedImageCandidates> => {
  const pageUrl = assertSafeRemoteUrl(inputUrl);
  const maxCandidatesCollected = Math.max(1, Math.floor(options?.maxCandidatesCollected ?? DEFAULT_MAX_CANDIDATES_COLLECTED));
  const maxCandidatesScored = Math.max(1, Math.floor(options?.maxCandidatesScored ?? DEFAULT_MAX_CANDIDATES_SCORED));

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
    const buffer = Buffer.from(await readArrayBufferWithLimit(response, MAX_IMAGE_BYTES));
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) {
      throw new Error("Could not read image metadata.");
    }

    const directKeywordScore = scoreCandidateKeywords(finalUrl, finalUrl);
    const directResolutionScore = scoreByResolution(width, height);
    return {
      pageUrl: finalUrl,
      title: null,
      candidates: [
        {
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
        },
      ],
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

  const resolved = await mapWithConcurrency(drafts, 6, (candidate) => fetchAndScoreCandidate(candidate));
  const candidates = resolved
    .filter((entry): entry is ResolvedImageCandidate => Boolean(entry))
    .sort((a, b) => b.finalScore - a.finalScore);

  if (candidates.length === 0) {
    throw new Error("Could not resolve any valid image candidates.");
  }

  return { pageUrl: finalUrl, title, candidates };
};

export const isDecorativeAssetUrl = (inputUrl: string) => {
  const lower = inputUrl.toLowerCase();
  return (
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("/images/brand/") ||
    lower.includes("/mfile_") ||
    lower.includes("/campaign_service/") ||
    lower.includes("/goodsdetail/banner/") ||
    lower.includes("/static/assets/")
  );
};

export const isModelLikeImageUrl = (inputUrl: string) => {
  const lower = inputUrl.toLowerCase();
  return MUSINSA_MODEL_URL_KEYWORDS.some((token) => lower.includes(token));
};

export const isLikelyMusinsaStandaloneCandidate = (candidate: Pick<ResolvedImageCandidate, "url" | "source">) => {
  const lower = candidate.url.toLowerCase();
  if (isDecorativeAssetUrl(lower)) return false;
  if (isModelLikeImageUrl(lower)) return false;
  if (candidate.source === "musinsa_goods_state" || candidate.source === "musinsa_structured") return true;
  if (lower.includes("msscdn") && lower.includes("/images/") && !isModelLikeImageUrl(lower)) return true;
  return (
    lower.includes("/images/goods/") ||
    lower.includes("/images/goods_img/") ||
    lower.includes("/images/prd_img/") ||
    lower.includes("/goods_img/") ||
    lower.includes("detail_") ||
    lower.includes("product_img") ||
    lower.includes("/product/") ||
    lower.includes("/products/")
  );
};

export const prioritizeStandaloneCandidates = (candidates: ResolvedImageCandidate[], pageUrl: string) => {
  if (!isMusinsaProductPageUrl(pageUrl) || candidates.length <= 1) return candidates;
  const preferred = candidates.filter((candidate) => isLikelyMusinsaStandaloneCandidate(candidate));
  if (preferred.length === 0) return candidates;
  const preferredUrls = new Set(preferred.map((candidate) => candidate.url));
  return [...preferred, ...candidates.filter((candidate) => !preferredUrls.has(candidate.url))];
};

export const buildImportCandidatePreviews = (candidates: ResolvedImageCandidate[], pageUrl: string, maxCount = 24): CandidatePreview[] => {
  const uniqueCandidates = uniqueBy(candidates, (candidate) => candidate.url).filter(
    (candidate) => candidate.url.trim().length > 0 && !isDecorativeAssetUrl(candidate.url) && candidate.width >= 220 && candidate.height >= 220
  );
  const isMusinsaImport = isMusinsaProductPageUrl(pageUrl);
  const musinsaRepresentativeCandidates = uniqueCandidates.filter(
    (candidate) =>
      (candidate.source === "musinsa_goods_state" || candidate.source === "musinsa_structured") &&
      isLikelyMusinsaStandaloneCandidate(candidate)
  );
  const productLikeCandidates = uniqueCandidates.filter((candidate) => isLikelyMusinsaStandaloneCandidate(candidate));
  const previewPool = isMusinsaImport
    ? musinsaRepresentativeCandidates.length > 0
      ? musinsaRepresentativeCandidates
      : productLikeCandidates.length > 0
        ? productLikeCandidates
        : uniqueCandidates
    : productLikeCandidates.length > 0
      ? productLikeCandidates
      : uniqueCandidates;

  return previewPool.slice(0, maxCount).map((candidate) => ({
    id: `${candidate.discoveryIndex}:${candidate.source}:${candidate.url}`,
    url: candidate.url,
    source: candidate.source,
    finalScore: candidate.finalScore,
    width: candidate.width,
    height: candidate.height,
    isModelLike: isModelLikeImageUrl(candidate.url),
    facesOverMinArea: 0,
  }));
};

export const resolveManualCandidate = async (url: string, pageUrl: string): Promise<ResolvedImageCandidate> => {
  const normalizedUrl = normalizeUrlCandidate(url, pageUrl) || assertSafeRemoteUrl(url).toString();
  const { response, finalUrl } = await fetchWithSafeRedirects(normalizedUrl, {
    headers: {
      ...DEFAULT_FETCH_HEADERS,
      Accept: "image/*",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch selected image (${response.status}).`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await readArrayBufferWithLimit(response, MAX_IMAGE_BYTES));
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error("Could not read selected image metadata.");
  return {
    url: finalUrl,
    source: "manual",
    sourcePriority: sourcePriorityByType.manual,
    keywordScore: scoreCandidateKeywords(finalUrl, pageUrl),
    discoveryIndex: -1,
    preliminaryScore: sourcePriorityByType.manual,
    finalScore: sourcePriorityByType.manual + scoreByResolution(width, height),
    width,
    height,
    mime: contentType,
    buffer,
  };
};

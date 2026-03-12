import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  createAsset,
  createJob,
  createProduct,
  insertProductImages,
  updateProductStatus,
} from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import {
  JOB_TYPES,
  type ImportCartJobPayload,
  type ImportProductJobPayload,
  type ImportUploadJobPayload,
} from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";

type Candidate = {
  url: string;
  source: string;
  score: number;
};

type ResolvedCandidate = Candidate & {
  buffer: Buffer;
  contentType: string;
  width: number | null;
  height: number | null;
};

type CandidatePreview = {
  id: string;
  url: string;
  source: string;
  finalScore: number;
  width: number;
  height: number;
  isModelLike: boolean;
  facesOverMinArea: number;
};

class CandidateSelectionRequiredError extends Error {
  result: { candidates: CandidatePreview[] };
  retryable = false;

  constructor(message: string, candidates: CandidatePreview[]) {
    super(message);
    this.name = "CANDIDATE_SELECTION_REQUIRED";
    this.result = { candidates };
  }
}

const PRODUCT_HINTS = ["product", "goods", "detail", "front", "main", "items", "images", "msscdn"];
const NEGATIVE_HINTS = ["logo", "banner", "sprite", "icon", "avatar", "review", "style", "snap"];

const normalizeUrl = (candidate: string, baseUrl: string) => {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
};

const unique = (input: string[]) => Array.from(new Set(input));

const collectCandidates = (html: string, baseUrl: string) => {
  const urls: Candidate[] = [];

  const metaRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(metaRegex)) {
    const normalized = normalizeUrl(match[1] || "", baseUrl);
    if (normalized) urls.push({ url: normalized, source: "meta", score: 140 });
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let imgRank = 0;
  for (const match of html.matchAll(imgRegex)) {
    const normalized = normalizeUrl(match[1] || "", baseUrl);
    if (!normalized) continue;
    urls.push({ url: normalized, source: "img", score: Math.max(20, 120 - imgRank) });
    imgRank += 1;
    if (imgRank >= 120) break;
  }

  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRegex)) {
    const raw = match[1] || "";
    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of queue) {
        const image = (item as { image?: unknown }).image;
        if (typeof image === "string") {
          const normalized = normalizeUrl(image, baseUrl);
          if (normalized) urls.push({ url: normalized, source: "jsonld", score: 180 });
        }
        if (Array.isArray(image)) {
          for (const imageUrl of image) {
            if (typeof imageUrl !== "string") continue;
            const normalized = normalizeUrl(imageUrl, baseUrl);
            if (normalized) urls.push({ url: normalized, source: "jsonld", score: 170 });
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return urls;
};

const scoreCandidate = (candidateUrl: string, baseScore: number, index: number) => {
  const lower = candidateUrl.toLowerCase();
  let score = baseScore - index;
  for (const hint of PRODUCT_HINTS) {
    if (lower.includes(hint)) score += 18;
  }
  for (const hint of NEGATIVE_HINTS) {
    if (lower.includes(hint)) score -= 30;
  }
  if (lower.endsWith(".webp")) score += 3;
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) score += 6;
  return score;
};

const fetchHtml = async (url: string) => {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch source page (${response.status}).`);
  }
  return response.text();
};

const fetchImageBuffer = async (url: string) => {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  if (!contentType.toLowerCase().includes("image")) {
    throw new Error(`Candidate is not an image (${contentType}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  return {
    buffer,
    contentType,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
};

const toCandidatePreview = (candidate: Candidate, image: { width: number | null; height: number | null }) => ({
  id: `${candidate.source}:${candidate.url}`,
  url: candidate.url,
  source: candidate.source,
  finalScore: candidate.score,
  width: image.width ?? 0,
  height: image.height ?? 0,
  isModelLike: false,
  facesOverMinArea: 0,
});

const resolveCandidatePreviews = async (candidates: Candidate[]) => {
  const resolved = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const image = await fetchImageBuffer(candidate.url);
        return toCandidatePreview(candidate, image);
      } catch {
        return null;
      }
    })
  );

  return resolved.filter((candidate): candidate is CandidatePreview => Boolean(candidate));
};

const selectStandaloneCandidate = async (
  candidates: Candidate[],
  selectedImageUrl?: string
): Promise<ResolvedCandidate | null> => {
  if (selectedImageUrl) {
    const image = await fetchImageBuffer(selectedImageUrl);
    if ((image.width ?? 0) < 180 || (image.height ?? 0) < 180) {
      throw new Error("Selected image is too small to register as an asset.");
    }
    return {
      url: selectedImageUrl,
      source: "manual",
      score: Number.MAX_SAFE_INTEGER,
      ...image,
    };
  }

  for (const candidate of candidates) {
    try {
      const image = await fetchImageBuffer(candidate.url);
      if ((image.width ?? 0) < 180 || (image.height ?? 0) < 180) continue;
      return {
        ...candidate,
        ...image,
      };
    } catch {
      // Try next candidate.
    }
  }
  return null;
};

const parseCartLinks = (html: string, baseUrl: string, maxItems: number) => {
  const links: string[] = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const href = match[1] || "";
    const normalized = normalizeUrl(href, baseUrl);
    if (!normalized) continue;
    if (!/\/products\/\d+/.test(normalized) && !/\/product\//.test(normalized)) continue;
    links.push(normalized);
  }
  return unique(links).slice(0, maxItems);
};

const processProductImport = async (userId: string, payload: ImportProductJobPayload) => {
  const productId = payload.product_id;
  const sourceUrl = payload.source_url;
  const html = await fetchHtml(sourceUrl);

  const rawCandidates = collectCandidates(html, sourceUrl);
  if (rawCandidates.length === 0) {
    await updateProductStatus(productId, "failed");
    throw new Error("No image candidates were extracted from product page.");
  }

  const deduped = unique(rawCandidates.map((item) => item.url));
  const scored = deduped
    .map((url, index) => ({
      url,
      source: rawCandidates.find((item) => item.url === url)?.source || "img",
      score: scoreCandidate(url, rawCandidates.find((item) => item.url === url)?.score || 100, index),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  const candidatePreviews = await resolveCandidatePreviews(scored.slice(0, 12));
  const selected = await selectStandaloneCandidate(scored, payload.selected_image_url);
  if (!selected) {
    await updateProductStatus(productId, "failed");
    throw new CandidateSelectionRequiredError(
      "No valid standalone image passed the importer checks.",
      candidatePreviews
    );
  }

  const storage = getStorageAdapter();
  const ext = selected.contentType.includes("png") ? "png" : selected.contentType.includes("webp") ? "webp" : "jpg";
  const objectKey = `products/${productId}/original-${randomUUID()}.${ext}`;
  const uploaded = await storage.uploadBuffer(objectKey, selected.buffer, selected.contentType);

  const persistedCandidates = (() => {
    const candidates = scored.slice(0, 12);
    const hasSelected = candidates.some((candidate) => candidate.url === selected.url);
    if (hasSelected) return candidates;

    return [
      { url: selected.url, source: selected.source, score: selected.score },
      ...candidates.slice(0, 11),
    ];
  })();
  const previewByUrl = new Map(candidatePreviews.map((candidate) => [candidate.url, candidate]));

  await insertProductImages(
    persistedCandidates.map((candidate, index) => ({
      productId,
      sourceUrl: candidate.url,
      normalizedUrl: candidate.url,
      candidateRank: index + 1,
      score: candidate.score,
      isSelected: candidate.url === selected.url,
      width:
        candidate.url === selected.url
          ? selected.width ?? undefined
          : previewByUrl.get(candidate.url)?.width || undefined,
      height:
        candidate.url === selected.url
          ? selected.height ?? undefined
          : previewByUrl.get(candidate.url)?.height || undefined,
      sha256:
        candidate.url === selected.url
          ? createHash("sha256").update(selected.buffer).digest("hex")
          : undefined,
      storageKey: candidate.url === selected.url ? uploaded.key : undefined,
    }))
  );

  const asset = await createAsset({
    userId,
    productId,
    originalImageUrl: uploaded.url,
    category: payload.category_hint,
  });

  const bgJob = await createJob({
    userId,
    jobType: JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
    payload: {
      asset_id: asset.id,
      image_url: uploaded.url,
      category_hint: payload.category_hint,
    },
  });

  await updateProductStatus(productId, "imported");

  return {
    product_id: productId,
    selected_image_url: selected.url,
    asset_id: asset.id,
    next_job_id: bgJob.id,
  };
};

const processUploadImport = async (userId: string, payload: ImportUploadJobPayload) => {
  const asset = await createAsset({
    userId,
    productId: payload.product_id,
    originalImageUrl: payload.image_url,
    category: payload.category_hint,
  });

  await updateProductStatus(payload.product_id, "imported");

  const bgJob = await createJob({
    userId,
    jobType: JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
    payload: {
      asset_id: asset.id,
      image_url: payload.image_url,
      category_hint: payload.category_hint,
    },
  });

  return {
    product_id: payload.product_id,
    asset_id: asset.id,
    next_job_id: bgJob.id,
  };
};

const processCartImport = async (userId: string, parentJobId: string, payload: ImportCartJobPayload) => {
  const maxItems = Math.min(100, Math.max(1, Number(payload.max_items ?? 20)));
  const html = await fetchHtml(payload.cart_url);
  const productLinks = parseCartLinks(html, payload.cart_url, maxItems);

  if (productLinks.length === 0) {
    throw new Error("No importable product links were found in cart page.");
  }

  const childJobIds: string[] = [];

  for (const [index, productUrl] of productLinks.entries()) {
    const product = await createProduct({
      userId,
      sourceType: "cart_url",
      sourceUrl: productUrl,
    });

    const childJob = await createJob({
      userId,
      jobType: JOB_TYPES.IMPORT_PRODUCT_URL,
      payload: {
        product_id: product.id,
        source_url: productUrl,
      },
      parentJobId,
      idempotencyKey: `cart-${parentJobId}-${index}`,
    });

    childJobIds.push(childJob.id);
  }

  return {
    source_cart_url: payload.cart_url,
    queued_products: childJobIds.length,
    child_job_ids: childJobIds,
  };
};

export const importerWorkerDefinition: WorkerDefinition = {
  workerName: "worker_importer",
  jobTypes: [JOB_TYPES.IMPORT_PRODUCT_URL, JOB_TYPES.IMPORT_CART_URL, JOB_TYPES.IMPORT_UPLOAD_IMAGE],
  handler: async ({ job }) => {
    const userId = job.user_id;

    if (job.job_type === JOB_TYPES.IMPORT_PRODUCT_URL) {
      return processProductImport(userId, job.payload as unknown as ImportProductJobPayload);
    }

    if (job.job_type === JOB_TYPES.IMPORT_UPLOAD_IMAGE) {
      return processUploadImport(userId, job.payload as unknown as ImportUploadJobPayload);
    }

    if (job.job_type === JOB_TYPES.IMPORT_CART_URL) {
      return processCartImport(
        userId,
        job.id,
        job.payload as unknown as ImportCartJobPayload
      );
    }

    throw new Error(`Unsupported importer job type: ${job.job_type}`);
  },
};

export const runImporterWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || importerWorkerDefinition.workerName,
    jobTypes: importerWorkerDefinition.jobTypes,
    handler: importerWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runImporterWorker().catch((error) => {
    logger.error("worker.importer.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}

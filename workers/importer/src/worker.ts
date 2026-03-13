import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  buildImportCandidatePreviews,
  isLikelyMusinsaStandaloneCandidate,
  isModelLikeImageUrl,
  isMusinsaProductPageUrl,
  prioritizeStandaloneCandidates,
  resolveManualCandidate,
  resolveProductImageCandidates,
  type CandidatePreview,
  type ResolvedImageCandidate,
} from "./productCandidates.js";

class CandidateSelectionRequiredError extends Error {
  result: { candidates: CandidatePreview[] };
  retryable = false;

  constructor(message: string, candidates: CandidatePreview[]) {
    super(message);
    this.name = "CANDIDATE_SELECTION_REQUIRED";
    this.result = { candidates };
  }
}

const uniqueByUrl = (candidates: ResolvedImageCandidate[]) => {
  const seen = new Set<string>();
  const output: ResolvedImageCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    output.push(candidate);
  }
  return output;
};

const fetchHtml = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch source page (${response.status}).`);
  }
  return response.text();
};

const parseCartLinks = (html: string, baseUrl: string, maxItems: number) => {
  const links = new Set<string>();
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1] || "";
    try {
      const normalized = new URL(href, baseUrl).toString();
      if (!/\/products\/\d+/.test(normalized) && !/\/product\//.test(normalized)) continue;
      links.add(normalized);
    } catch {
      // Ignore malformed links.
    }
  }

  return Array.from(links).slice(0, maxItems);
};

const buildCandidatePool = (
  resolved: Awaited<ReturnType<typeof resolveProductImageCandidates>>,
  selectedImageUrl?: string
) => {
  const isMusinsaImport = isMusinsaProductPageUrl(resolved.pageUrl);
  const basePool = isMusinsaImport ? resolved.candidates.slice(0, 120) : resolved.candidates.slice(0, 40);
  let candidatePool = isMusinsaImport ? prioritizeStandaloneCandidates(basePool, resolved.pageUrl) : basePool;

  if (selectedImageUrl) {
    const manualCandidate = candidatePool.find((candidate) => candidate.url === selectedImageUrl);
    if (manualCandidate) {
      candidatePool = [manualCandidate, ...candidatePool.filter((candidate) => candidate.url !== manualCandidate.url)];
    }
  }

  return {
    isMusinsaImport,
    candidates: uniqueByUrl(candidatePool),
  };
};

const selectCandidate = async (
  resolved: Awaited<ReturnType<typeof resolveProductImageCandidates>>,
  payload: ImportProductJobPayload
) => {
  const { isMusinsaImport, candidates } = buildCandidatePool(resolved, payload.selected_image_url);
  const previews = buildImportCandidatePreviews(candidates, resolved.pageUrl, isMusinsaImport ? 24 : 16);

  if (payload.selected_image_url) {
    const manual = await resolveManualCandidate(payload.selected_image_url, resolved.pageUrl);
    if (manual.width < 220 || manual.height < 220) {
      throw new Error("Selected image is too small to register as an asset.");
    }
    return {
      selected: manual,
      previews,
      persistedCandidates: [manual, ...candidates.filter((candidate) => candidate.url !== manual.url)].slice(0, 24),
    };
  }

  const strictNoModelImport = (process.env.STRICT_NO_MODEL_IMPORT || "false").toLowerCase() === "true";
  const standaloneCandidates = candidates.filter((candidate) => {
    if (candidate.width < 220 || candidate.height < 220) return false;
    if (isMusinsaImport) return isLikelyMusinsaStandaloneCandidate(candidate);
    return !isModelLikeImageUrl(candidate.url);
  });
  const viableCandidates = standaloneCandidates.length > 0 ? standaloneCandidates : candidates.filter((candidate) => candidate.width >= 220 && candidate.height >= 220);

  if (strictNoModelImport && viableCandidates.every((candidate) => isModelLikeImageUrl(candidate.url))) {
    throw new CandidateSelectionRequiredError(
      "Only model-like images were detected; select a standalone product image manually.",
      previews
    );
  }

  const selected = viableCandidates[0];
  if (!selected) {
    throw new CandidateSelectionRequiredError("No valid standalone image passed the importer checks.", previews);
  }

  if (isMusinsaImport && !isLikelyMusinsaStandaloneCandidate(selected)) {
    throw new CandidateSelectionRequiredError(
      "Automatic detection could not confirm a standalone Musinsa product image. Select one manually.",
      previews
    );
  }

  return {
    selected,
    previews,
    persistedCandidates: uniqueByUrl([
      selected,
      ...candidates.filter((candidate) => candidate.url !== selected.url),
    ]).slice(0, 24),
  };
};

const processProductImport = async (userId: string, payload: ImportProductJobPayload) => {
  const resolved = await resolveProductImageCandidates(payload.source_url, {
    maxCandidatesCollected: isMusinsaProductPageUrl(payload.source_url) ? 320 : 200,
    maxCandidatesScored: isMusinsaProductPageUrl(payload.source_url) ? 160 : 48,
  });

  const { selected, previews, persistedCandidates } = await selectCandidate(resolved, payload);
  const storage = getStorageAdapter();
  const ext = selected.mime.includes("png") ? "png" : selected.mime.includes("webp") ? "webp" : "jpg";
  const objectKey = `products/${payload.product_id}/original-${randomUUID()}.${ext}`;
  const uploaded = await storage.uploadBuffer(objectKey, selected.buffer, selected.mime);
  const previewByUrl = new Map(previews.map((candidate) => [candidate.url, candidate]));

  await insertProductImages(
    persistedCandidates.map((candidate, index) => ({
      productId: payload.product_id,
      sourceUrl: candidate.url,
      normalizedUrl: candidate.url,
      candidateRank: index + 1,
      score: candidate.finalScore,
      isSelected: candidate.url === selected.url,
      width: candidate.width || previewByUrl.get(candidate.url)?.width || undefined,
      height: candidate.height || previewByUrl.get(candidate.url)?.height || undefined,
      sha256: candidate.url === selected.url ? createHash("sha256").update(selected.buffer).digest("hex") : undefined,
      storageKey: candidate.url === selected.url ? uploaded.key : undefined,
    }))
  );

  const asset = await createAsset({
    userId,
    productId: payload.product_id,
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

  await updateProductStatus(payload.product_id, "imported");

  return {
    product_id: payload.product_id,
    page_url: resolved.pageUrl,
    title: resolved.title,
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
    const error = new Error("No importable product links were found in cart page.");
    error.name = "NO_IMPORTABLE_PRODUCTS";
    throw error;
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
      return processProductImport(userId, job.payload as ImportProductJobPayload);
    }

    if (job.job_type === JOB_TYPES.IMPORT_UPLOAD_IMAGE) {
      return processUploadImport(userId, job.payload as ImportUploadJobPayload);
    }

    if (job.job_type === JOB_TYPES.IMPORT_CART_URL) {
      return processCartImport(userId, job.id, job.payload as ImportCartJobPayload);
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

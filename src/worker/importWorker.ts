import fs from "node:fs/promises";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  AssetImportError,
  type AssetImportFailureCode,
  importAssetFromUrlAndSave,
  type ImportAttemptLog,
  type ImportImageCandidate,
} from "../lib/assetImport";
import {
  fetchProductLinksFromCartUrl,
  postProcessCutout,
  removeBackground,
} from "../lib/assetProcessing";
import type {
  ImportJobAsset,
  ImportJobData,
  ImportJobFailureItem,
  ImportJobResult,
} from "../lib/importQueue";
import { saveAsset } from "../lib/assetStore";
import { requireRedisUrl, serverConfig } from "../lib/serverConfig";

const connection = new IORedis(requireRedisUrl(), {
  maxRetriesPerRequest: null,
});

const concurrency = serverConfig.importConcurrency;

const mapStoredAssetToJobAsset = (
  record: Awaited<ReturnType<typeof saveAsset>>,
  imageDataUrl: string
): ImportJobAsset => ({
  id: record.id,
  name: record.name,
  category: record.category,
  source: record.source,
  imageSrc: imageDataUrl,
  removedBackground: record.removed_background,
  sourceUrl: record.source_url ?? undefined,
  selectedImageUrl: record.selected_image_url ?? undefined,
  warnings: record.warnings ?? undefined,
  processing: record.processing ?? undefined,
});

const mapWithConcurrency = async <T, R>(
  list: T[],
  concurrencyLimit: number,
  mapper: (entry: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (list.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrencyLimit, list.length));
  const out: R[] = new Array(list.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= list.length) return;
      out[index] = await mapper(list[index], index);
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
};

const toFailureCodeFromMessage = (message: string): AssetImportFailureCode => {
  const lower = message.toLowerCase();
  if (
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("forbidden") ||
    lower.includes("unauthorized") ||
    lower.includes("login") ||
    lower.includes("blocked")
  ) {
    return "FETCH_BLOCKED_OR_LOGIN_REQUIRED";
  }
  if (lower.includes("no product links") || lower.includes("no preview image")) {
    return "NO_IMAGE_FOUND";
  }
  return "UNKNOWN_IMPORT_ERROR";
};

const mapImportErrorToFailure = (
  error: unknown,
  fallback: { code?: string; message: string }
): { code: string; message: string; attempts?: ImportAttemptLog[]; candidates?: ImportImageCandidate[] } => {
  if (error instanceof AssetImportError) {
    return {
      code: error.code,
      message: error.message,
      attempts: error.attempts,
      candidates: error.candidates,
    };
  }

  if (error instanceof Error) {
    return {
      code: fallback.code ?? toFailureCodeFromMessage(error.message),
      message: error.message,
    };
  }

  return {
    code: fallback.code ?? "UNKNOWN_IMPORT_ERROR",
    message: fallback.message,
  };
};

const processUrlImportJob = async (job: Job<ImportJobData, ImportJobResult>) => {
  const payload = job.data;
  if (payload.type !== "url") {
    throw new Error("Invalid URL import payload.");
  }

  try {
    const imported = await importAssetFromUrlAndSave({
      url: payload.url,
      category: payload.category,
      name: payload.name,
      source: "import",
      sourceUrl: payload.sourceUrl ?? payload.url,
      maxCandidates: 8,
      maxRemovebgAttempts: 3,
      selectedImageUrl: payload.selectedImageUrl,
    });

    return {
      type: "url",
      status: "completed",
      asset: imported.asset,
      selectedImageUrl: imported.selectedImageUrl,
      warnings: imported.warnings,
      attempts: imported.attempts,
    } satisfies ImportJobResult;
  } catch (error) {
    const failure = mapImportErrorToFailure(error, {
      message: "Failed to import asset from URL.",
    });

    return {
      type: "url",
      status: "failed",
      code: failure.code,
      error: failure.message,
      attempts: failure.attempts,
      candidates: failure.candidates,
    } satisfies ImportJobResult;
  }
};

const processCartImportJob = async (job: Job<ImportJobData, ImportJobResult>) => {
  const payload = job.data;
  if (payload.type !== "cart") {
    throw new Error("Invalid cart import payload.");
  }

  try {
    const { productUrls } = await fetchProductLinksFromCartUrl(payload.url, payload.maxItems);
    await job.updateProgress({ stage: "resolved", total: productUrls.length, processed: 0 });

    const failures: ImportJobFailureItem[] = [];
    const assets: ImportJobAsset[] = [];
    let processed = 0;

    const results = await mapWithConcurrency(
      productUrls,
      serverConfig.importCartItemConcurrency,
      async (productUrl, index) => {
        try {
          const imported = await importAssetFromUrlAndSave({
            url: productUrl,
            category: payload.category,
            source: "import",
            sourceUrl: productUrl,
            maxCandidates: 8,
            maxRemovebgAttempts: 3,
          });

          return {
            ok: true as const,
            asset: imported.asset,
          };
        } catch (error) {
          const failure = mapImportErrorToFailure(error, {
            message: "Failed to import cart item.",
          });
          return {
            ok: false as const,
            failed: {
              url: productUrl,
              error: failure.message,
              code: failure.code,
              attempts: failure.attempts,
              candidates: failure.candidates,
            },
          };
        } finally {
          processed += 1;
          const progress = Math.min(99, Math.floor((processed / productUrls.length) * 100));
          await job.updateProgress({
            stage: "importing",
            total: productUrls.length,
            processed,
            currentIndex: index,
            progress,
          });
        }
      }
    );

    for (const result of results) {
      if (result.ok) {
        assets.push(result.asset);
      } else {
        failures.push(result.failed);
      }
    }

    await job.updateProgress({ stage: "finalizing", total: productUrls.length, processed });

    if (assets.length === 0) {
      return {
        type: "cart",
        status: "failed",
        code: "NO_IMPORTABLE_PRODUCTS",
        error: "Could not import any products from this cart link.",
        totalProducts: productUrls.length,
        importedCount: 0,
        failedCount: failures.length,
        failed: failures,
      } satisfies ImportJobResult;
    }

    return {
      type: "cart",
      status: "completed",
      assets,
      totalProducts: productUrls.length,
      importedCount: assets.length,
      failedCount: failures.length,
      failed: failures,
    } satisfies ImportJobResult;
  } catch (error) {
    const failure = mapImportErrorToFailure(error, {
      message: "Failed to import products from cart link.",
    });

    return {
      type: "cart",
      status: "failed",
      code: failure.code,
      error: failure.message,
      totalProducts: 0,
      importedCount: 0,
      failedCount: 0,
      failed: [],
    } satisfies ImportJobResult;
  }
};

const processFileImportJob = async (job: Job<ImportJobData, ImportJobResult>) => {
  const payload = job.data;
  if (payload.type !== "file") {
    throw new Error("Invalid file import payload.");
  }

  const warnings = new Set<string>();

  try {
    const inputBuffer = await fs.readFile(payload.filePath);
    const removed = await removeBackground(inputBuffer, payload.mime, { crop: true });
    for (const warning of removed.warnings ?? []) {
      warnings.add(warning);
    }

    let outputBuffer = removed.buffer;
    let outputMime = removed.mime;
    const processing: Record<string, unknown> = {
      method: "upload-removebg",
      removedBackground: removed.removedBackground,
    };

    if (removed.removedBackground) {
      try {
        const processed = await postProcessCutout(removed.buffer, {
          alphaThreshold: 12,
          minAlphaAreaRatio: 0.01,
          maxAlphaAreaRatio: 0.95,
          maxBboxAreaRatio: 0.98,
          minTrimSizePx: 40,
        });
        outputBuffer = processed.buffer;
        outputMime = processed.mime;
        processing.quality = processed.quality;
        processing.trim = {
          rect: processed.trimRect,
          originalSize: processed.originalSize,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown trim error";
        warnings.add(`TRIM_FAILED:${message}`);
      }
    }

    const imageDataUrl = `data:${outputMime};base64,${outputBuffer.toString("base64")}`;
    const mergedWarnings = Array.from(warnings);

    const record = await saveAsset({
      name: payload.name?.trim() || "Uploaded item",
      category: payload.category,
      source: "upload",
      imageDataUrl,
      removedBackground: removed.removedBackground,
      sourceUrl: payload.sourceUrl ?? null,
      processing,
      warnings: mergedWarnings,
    });

    return {
      type: "file",
      status: "completed",
      asset: mapStoredAssetToJobAsset(record, imageDataUrl),
      removedBackground: removed.removedBackground,
      warnings: mergedWarnings,
    } satisfies ImportJobResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process uploaded file.";
    return {
      type: "file",
      status: "failed",
      code: "UPLOAD_PROCESSING_FAILED",
      error: message,
      warnings: Array.from(warnings),
    } satisfies ImportJobResult;
  } finally {
    await fs.unlink(payload.filePath).catch(() => undefined);
  }
};

const processJob = async (job: Job<ImportJobData, ImportJobResult>): Promise<ImportJobResult> => {
  await job.updateProgress({ stage: "queued" });

  if (job.data.type === "url") {
    return processUrlImportJob(job);
  }
  if (job.data.type === "cart") {
    return processCartImportJob(job);
  }
  return processFileImportJob(job);
};

const worker = new Worker<ImportJobData, ImportJobResult>("asset-import", processJob, {
  connection,
  concurrency,
});

worker.on("ready", () => {
  console.log(`[Import Worker] Ready. concurrency=${concurrency}`);
});

worker.on("failed", (job, error) => {
  console.error(`[Import Worker] Job ${job?.id} failed:`, error);
});

worker.on("completed", (job, result) => {
  if (result?.status === "failed") {
    console.warn(`[Import Worker] Job ${job.id} completed with failure code=${result.code}.`);
    return;
  }
  console.log(`[Import Worker] Job ${job.id} completed.`);
});

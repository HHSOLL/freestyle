import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJob, getAssetById, updateAsset } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import {
  JOB_TYPES,
  backgroundRemovalJobPayloadSchema,
  normalizeQueuedJobPayload,
  type BackgroundRemovalJobPayload,
} from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";
import {
  createHeuristicCutout,
  hasMeaningfulAlpha,
  mapCutoutQualityReasonToErrorCode,
  postProcessCutout,
} from "./cutout.js";

type CutoutStrategy = "remote_remove_bg" | "embedded_alpha" | "local_heuristic";

type CutoutAttempt = {
  strategy: CutoutStrategy;
  code: string;
  message: string;
  quality?: Record<string, unknown>;
};

type SuccessfulCutout = {
  strategy: CutoutStrategy;
  processed: Awaited<ReturnType<typeof postProcessCutout>>;
};

const createTerminalCutoutError = (message: string, result?: Record<string, unknown>) => {
  const error = new Error(message) as Error & {
    retryable?: boolean;
    result?: Record<string, unknown>;
  };
  error.retryable = false;
  error.result = result;
  return error;
};

const mimeToExtension = (mime: string) => {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
};

const isRemoteRemovalConfigured = () =>
  Boolean(process.env.BG_REMOVAL_API_KEY || process.env.REMOVE_BG_API_KEY);

const fetchSourceImage = async (imageUrl: string) => {
  const response = await fetch(imageUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch source image (${response.status}).`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") || "image/jpeg",
  };
};

const removeBackground = async (sourceBuffer: Buffer, mimeType: string) => {
  const apiKey = process.env.BG_REMOVAL_API_KEY || process.env.REMOVE_BG_API_KEY;
  const endpoint = process.env.BG_REMOVAL_ENDPOINT || process.env.REMOVE_BG_ENDPOINT || "https://api.remove.bg/v1.0/removebg";
  const size = process.env.REMOVE_BG_SIZE || "auto";

  if (!apiKey) {
    const error = new Error("Background removal API key is missing.");
    error.name = "CUTOUT_NOT_AVAILABLE";
    throw error;
  }

  const form = new FormData();
  const imageBytes = new Uint8Array(sourceBuffer);
  form.set(
    "image_file",
    new Blob([imageBytes], { type: mimeType }),
    `asset.${mimeToExtension(mimeType)}`
  );
  form.set("size", size);
  form.set("crop", "true");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const error = new Error(`Background removal failed (${response.status}).`);
    error.name = "CUTOUT_NOT_AVAILABLE";
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
};

const buildQualityAttempt = (
  strategy: CutoutStrategy,
  processed: Awaited<ReturnType<typeof postProcessCutout>>
): CutoutAttempt => ({
  strategy,
  code: mapCutoutQualityReasonToErrorCode(processed.quality.reason),
  message: `Cutout quality failed: ${processed.quality.reason ?? "UNKNOWN"}`,
  quality: {
    quality: processed.quality,
    trimRect: processed.trimRect,
    originalSize: processed.originalSize,
  },
});

const processCutoutCandidate = async (
  strategy: CutoutStrategy,
  buffer: Buffer
): Promise<SuccessfulCutout> => ({
  strategy,
  processed: await postProcessCutout(buffer),
});

const createUnavailableCutoutError = (attempts: CutoutAttempt[]) => {
  const error = createTerminalCutoutError("Background removal is unavailable for this asset.", { attempts });
  error.name = "CUTOUT_NOT_AVAILABLE";
  return error;
};

const findLastNonAvailabilityAttempt = (attempts: CutoutAttempt[]) => {
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (attempt && attempt.code !== "CUTOUT_NOT_AVAILABLE") {
      return attempt;
    }
  }
  return null;
};

export const backgroundRemovalWorkerDefinition: WorkerDefinition = {
  workerName: "worker_background_removal",
  jobTypes: [JOB_TYPES.BACKGROUND_REMOVAL_PROCESS],
  handler: async ({ job }) => {
    const payloadEnvelope = normalizeQueuedJobPayload({
      jobType: JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
      payload: job.payload,
      schema: backgroundRemovalJobPayloadSchema,
      fallbackTraceId: job.id,
      idempotencyKey: job.idempotency_key,
    });
    const payload: BackgroundRemovalJobPayload = payloadEnvelope.data;
    if (!payload.asset_id || !payload.image_url) {
      throw new Error("Invalid background removal job payload.");
    }

    try {
      const asset = await getAssetById(payload.asset_id);
      const sourceImage = await fetchSourceImage(payload.image_url);
      const attempts: CutoutAttempt[] = [];
      let selectedCutout: SuccessfulCutout | null = null;

      if (isRemoteRemovalConfigured()) {
        try {
          const externalCutout = await removeBackground(sourceImage.buffer, sourceImage.mimeType);
          const remoteProcessed = await processCutoutCandidate("remote_remove_bg", externalCutout);
          if (remoteProcessed.processed.quality.pass) {
            selectedCutout = remoteProcessed;
          } else {
            attempts.push(buildQualityAttempt("remote_remove_bg", remoteProcessed.processed));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Background removal service failed.";
          attempts.push({
            strategy: "remote_remove_bg",
            code: error instanceof Error ? error.name || "CUTOUT_NOT_AVAILABLE" : "CUTOUT_NOT_AVAILABLE",
            message,
          });
        }
      }

      if (!selectedCutout) {
        const inputAlreadyHasAlpha = await hasMeaningfulAlpha(sourceImage.buffer);
        const localStrategy: CutoutStrategy = inputAlreadyHasAlpha ? "embedded_alpha" : "local_heuristic";

        try {
          const localBuffer = inputAlreadyHasAlpha ? sourceImage.buffer : await createHeuristicCutout(sourceImage.buffer);
          const localProcessed = await processCutoutCandidate(localStrategy, localBuffer);
          if (localProcessed.processed.quality.pass) {
            selectedCutout = localProcessed;
          } else {
            attempts.push(buildQualityAttempt(localStrategy, localProcessed.processed));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Local cutout fallback failed.";
          attempts.push({
            strategy: localStrategy,
            code: error instanceof Error ? error.name || "CUTOUT_NOT_AVAILABLE" : "CUTOUT_NOT_AVAILABLE",
            message,
          });
        }
      }

      if (!selectedCutout) {
        const qualityAttempt = findLastNonAvailabilityAttempt(attempts);
        if (qualityAttempt) {
          const error = createTerminalCutoutError(qualityAttempt.message, { attempts, ...qualityAttempt.quality });
          error.name = qualityAttempt.code;
          throw error;
        }
        throw createUnavailableCutoutError(attempts);
      }

      const storage = getStorageAdapter();
      const key = `assets/${payload.asset_id}/cutout.png`;
      const uploaded = await storage.uploadBuffer(key, selectedCutout.processed.buffer, "image/png");

      await updateAsset(payload.asset_id, {
        cutout_image_url: uploaded.url,
        mask_url: null,
        metadata: {
          ...(asset?.metadata ?? {}),
          cutout: {
            removedBackground: true,
            strategy: selectedCutout.strategy,
            fallbackUsed: selectedCutout.strategy !== "remote_remove_bg",
            quality: selectedCutout.processed.quality,
            trimRect: selectedCutout.processed.trimRect,
          },
          originalSize: asset?.metadata?.originalSize ?? selectedCutout.processed.originalSize,
        },
        status: "pending",
      });

      const nextJob = await createJob({
        userId: job.user_id,
        jobType: JOB_TYPES.ASSET_PROCESSOR_PROCESS,
        payload: {
          asset_id: payload.asset_id,
          category_hint: payload.category_hint,
        },
        traceId: payloadEnvelope.trace_id,
      });

      return {
        asset_id: payload.asset_id,
        cutout_image_url: uploaded.url,
        cutout_strategy: selectedCutout.strategy,
        next_job_id: nextJob.id,
      };
    } catch (error) {
      await updateAsset(payload.asset_id, { status: "failed" });
      throw error;
    }
  },
};

export const runBackgroundRemovalWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || backgroundRemovalWorkerDefinition.workerName,
    jobTypes: backgroundRemovalWorkerDefinition.jobTypes,
    handler: backgroundRemovalWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runBackgroundRemovalWorker().catch((error) => {
    logger.error("worker.background_removal.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}

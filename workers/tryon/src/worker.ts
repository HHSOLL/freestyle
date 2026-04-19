import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTryonWithGemini } from "@freestyle/ai";
import { getAssetById, getTryonById, updateTryon } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import {
  JOB_TYPES,
  normalizeQueuedJobPayload,
  tryonJobPayloadSchema,
  type JobRecord,
  type TryonJobPayload,
} from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";

const createTerminalTryonError = (code: string, message: string) => {
  const error = new Error(message) as Error & { retryable?: boolean };
  error.name = code;
  error.retryable = false;
  return error;
};

const extensionFromType = (contentType: string) => {
  const lower = contentType.toLowerCase();
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  return ".jpg";
};

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw createTerminalTryonError("TRYON_INVALID_INPUT_IMAGE", "Invalid model image data URL.");
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

const persistInputImageIfNeeded = async (tryonId: string, inputImageUrl: string) => {
  if (!inputImageUrl.startsWith("data:image/")) {
    return { publicUrl: inputImageUrl, source: inputImageUrl };
  }

  const parsed = parseDataUrl(inputImageUrl);
  const ext = extensionFromType(parsed.mimeType);
  const key = path.posix.join("tryons", tryonId, `input${ext}`);
  const storage = getStorageAdapter();
  const uploaded = await storage.uploadBuffer(key, parsed.buffer, parsed.mimeType);
  return {
    publicUrl: uploaded.url,
    source: inputImageUrl,
  };
};

export const parseTryonJobPayload = (job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.TRYON_GENERATE,
    payload: job.payload,
    schema: tryonJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  });

export const tryonWorkerDefinition: WorkerDefinition = {
  workerName: "worker_tryon",
  jobTypes: [JOB_TYPES.TRYON_GENERATE],
  handler: async ({ job }) => {
    const payloadEnvelope = parseTryonJobPayload(job);
    const payload: TryonJobPayload = payloadEnvelope.data;
    if (!payload.tryon_id || !payload.input_image_url || !payload.asset_id) {
      throw createTerminalTryonError("TRYON_INVALID_PAYLOAD", "Invalid try-on payload.");
    }

    const [row, asset] = await Promise.all([getTryonById(payload.tryon_id), getAssetById(payload.asset_id)]);
    if (!row) {
      throw createTerminalTryonError("TRYON_NOT_FOUND", `Try-on ${payload.tryon_id} not found.`);
    }
    if (!asset) {
      throw createTerminalTryonError("TRYON_ASSET_NOT_FOUND", `Asset ${payload.asset_id} not found.`);
    }

    await updateTryon(row.id, {
      status: "processing",
      provider: "google-gemini",
      error_message: null,
    });

    try {
      const normalizedInput = await persistInputImageIfNeeded(row.id, payload.input_image_url);
      const garmentImageUrl = asset.cutout_image_url || asset.original_image_url;
      if (!garmentImageUrl) {
        throw createTerminalTryonError("TRYON_ASSET_IMAGE_MISSING", "Asset image is unavailable for try-on.");
      }

      const generated = await generateTryonWithGemini({
        personImage: {
          value: normalizedInput.source,
          label: "person",
        },
        garmentImage: {
          value: garmentImageUrl,
          label: "garment",
        },
        categoryHint: asset.category,
      });

      const outputExt = extensionFromType(generated.mimeType);
      const outputKey = path.posix.join("tryons", row.id, `output${outputExt}`);
      const storage = getStorageAdapter();
      const uploaded = await storage.uploadBuffer(outputKey, generated.buffer, generated.mimeType);
      const updated = await updateTryon(row.id, {
        status: "succeeded",
        input_image_url: normalizedInput.publicUrl,
        output_image_url: uploaded.url,
        provider: generated.provider,
        provider_job_id: generated.model,
        error_message: null,
      });

      return {
        progress: 100,
        tryon_id: updated.id,
        output_image_url: updated.output_image_url,
        provider: updated.provider,
        model: generated.model,
        artifacts: [
          {
            kind: "tryon-output-image",
            url: uploaded.url,
            key: outputKey,
          },
        ],
        metrics: {
          provider: generated.provider,
          model: generated.model,
        },
      };
    } catch (error) {
      await updateTryon(row.id, {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Try-on generation failed.",
      }).catch(() => undefined);
      throw error;
    }
  },
};

export const runTryonWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || tryonWorkerDefinition.workerName,
    jobTypes: tryonWorkerDefinition.jobTypes,
    handler: tryonWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runTryonWorker().catch((error) => {
    logger.error("worker.tryon.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}

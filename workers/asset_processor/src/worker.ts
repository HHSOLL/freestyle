import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getAssetById, updateAsset } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import {
  JOB_TYPES,
  assetProcessorJobPayloadSchema,
  normalizeQueuedJobPayload,
  type AssetProcessorJobPayload,
} from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";
import { buildGarmentProfile, inferAssetCategory } from "./garmentProfile.js";

const computePerceptualHash = async (buffer: Buffer) => {
  const raw = await sharp(buffer)
    .grayscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer();

  const avg = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  let bits = "";
  for (const value of raw) {
    bits += value >= avg ? "1" : "0";
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
};

const computeDominantColor = async (buffer: Buffer) => {
  const [r, g, b] = await sharp(buffer)
    .ensureAlpha()
    .resize(1, 1, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer();
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

const fetchBuffer = async (url: string) => {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch asset image (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "image/png";
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
  };
};

export const assetProcessorWorkerDefinition: WorkerDefinition = {
  workerName: "worker_asset_processor",
  jobTypes: [JOB_TYPES.ASSET_PROCESSOR_PROCESS],
  handler: async ({ job }) => {
    const payload: AssetProcessorJobPayload = normalizeQueuedJobPayload({
      jobType: JOB_TYPES.ASSET_PROCESSOR_PROCESS,
      payload: job.payload,
      schema: assetProcessorJobPayloadSchema,
      fallbackTraceId: job.id,
      idempotencyKey: job.idempotency_key,
    }).data;
    if (!payload.asset_id) {
      throw new Error("Invalid asset processor payload.");
    }

    const asset = await getAssetById(payload.asset_id);
    if (!asset) {
      throw new Error(`Asset ${payload.asset_id} not found.`);
    }

    const sourceUrl = asset.cutout_image_url || asset.original_image_url;
    const { buffer, contentType } = await fetchBuffer(sourceUrl);
    const storage = getStorageAdapter();

    const small = await sharp(buffer)
      .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const medium = await sharp(buffer)
      .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    const smallUpload = await storage.uploadBuffer(`assets/${asset.id}/thumb-sm.png`, small, "image/png");
    const mediumUpload = await storage.uploadBuffer(`assets/${asset.id}/thumb-md.png`, medium, "image/png");

    const pHash = await computePerceptualHash(buffer);
    const dominantColor = await computeDominantColor(buffer);
    const category = inferAssetCategory(payload.category_hint, sourceUrl);
    const garmentProfile = await buildGarmentProfile(buffer, category);

    const updated = await updateAsset(asset.id, {
      thumbnail_small_url: smallUpload.url,
      thumbnail_medium_url: mediumUpload.url,
      category,
      perceptual_hash: pHash,
      embedding_model: process.env.EMBEDDING_MODEL || null,
      metadata: {
        ...(asset.metadata ?? {}),
        dominantColor,
        garmentProfile: garmentProfile ?? undefined,
      },
      status: "ready",
    });

    return {
      asset_id: asset.id,
      category: updated.category,
      perceptual_hash: pHash,
      thumbnail_small_url: smallUpload.url,
      thumbnail_medium_url: mediumUpload.url,
      dominant_color: dominantColor,
      garment_profile: garmentProfile,
      content_type: contentType,
    };
  },
};

export const runAssetProcessorWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || assetProcessorWorkerDefinition.workerName,
    jobTypes: assetProcessorWorkerDefinition.jobTypes,
    handler: assetProcessorWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runAssetProcessorWorker().catch((error) => {
    logger.error("worker.asset_processor.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}

import fs from "node:fs/promises";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  ASSET_STORAGE_PATH,
  buildAssetPath,
  bufferToArrayBuffer,
  ensureAssetStorageDir,
  fetchImageFromUrl,
  mimeToExtension,
  removeBackground,
} from "../lib/assetProcessing";
import type { BgRemovalJobData, BgRemovalJobResult } from "../lib/bgRemovalQueue";
import { requireRedisUrl, serverConfig } from "../lib/serverConfig";

const connection = new IORedis(requireRedisUrl(), {
  maxRetriesPerRequest: null,
});

const concurrency = serverConfig.bgRemovalConcurrency;

const processJob = async (job: { id?: string | number; data: BgRemovalJobData }) => {
  await ensureAssetStorageDir();
  const jobId = job.id ? String(job.id) : "bg-job";

  let inputBuffer: Buffer;
  let mime: string;

  if (job.data.mode === "file") {
    inputBuffer = await fs.readFile(job.data.inputPath);
    mime = job.data.mime;
  } else {
    const fetched = await fetchImageFromUrl(job.data.sourceUrl);
    inputBuffer = Buffer.from(fetched.buffer);
    mime = fetched.mime;
  }

  const result = await removeBackground(bufferToArrayBuffer(inputBuffer), mime);
  const outputExt = mimeToExtension(result.mime);
  const outputPath = buildAssetPath(jobId, "output", outputExt);
  await fs.writeFile(outputPath, result.buffer);

  if (job.data.mode === "file") {
    await fs.unlink(job.data.inputPath).catch(() => undefined);
  }

  const jobResult: BgRemovalJobResult = {
    outputPath,
    mime: result.mime,
    removedBackground: result.removedBackground,
    warnings: result.warnings,
  };

  if (!jobResult.removedBackground && jobResult.warnings?.length) {
    console.warn(`[BG Worker] Job ${jobId} warning: ${jobResult.warnings.join(" | ")}`);
  }

  return jobResult;
};

const worker = new Worker<BgRemovalJobData, BgRemovalJobResult>("bg-removal", processJob, {
  connection,
  concurrency,
});

worker.on("ready", () => {
  console.log(`[BG Worker] Ready. Storage: ${ASSET_STORAGE_PATH}`);
});

worker.on("failed", (job, error) => {
  console.error(`[BG Worker] Job ${job?.id} failed:`, error);
});

worker.on("completed", (job) => {
  console.log(`[BG Worker] Job ${job.id} completed.`);
});

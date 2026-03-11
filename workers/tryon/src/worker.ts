import path from "node:path";
import { getTryonById, updateTryon } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop } from "@freestyle/queue";
import { JOB_TYPES, type TryonJobPayload } from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";

const extensionFromType = (contentType: string) => {
  const lower = contentType.toLowerCase();
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  return ".jpg";
};

const copyInputAsOutput = async (tryonId: string, inputImageUrl: string) => {
  const response = await fetch(inputImageUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch try-on input image (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const extension = extensionFromType(contentType);
  const fileName = `output${extension}`;
  const key = path.posix.join("tryons", tryonId, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());

  const storage = getStorageAdapter();
  return storage.uploadBuffer(key, buffer, contentType);
};

const main = async () => {
  await runWorkerLoop({
    workerName: process.env.WORKER_NAME || "worker_tryon",
    jobTypes: [JOB_TYPES.TRYON_GENERATE],
    handler: async ({ job }) => {
      const payload = job.payload as unknown as TryonJobPayload;
      if (!payload.tryon_id || !payload.input_image_url) {
        throw new Error("Invalid try-on payload.");
      }

      const row = await getTryonById(payload.tryon_id);
      if (!row) {
        throw new Error(`Try-on ${payload.tryon_id} not found.`);
      }

      await updateTryon(row.id, {
        status: "processing",
        provider: process.env.TRYON_PROVIDER || "fallback-copy",
      });

      const output = await copyInputAsOutput(row.id, payload.input_image_url);
      const updated = await updateTryon(row.id, {
        status: "succeeded",
        output_image_url: output.url,
        provider_job_id: output.key,
      });

      return {
        tryon_id: updated.id,
        output_image_url: updated.output_image_url,
        provider: updated.provider,
      };
    },
  });
};

main().catch((error) => {
  logger.error("worker.tryon.crash", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});

import { createJob, updateAsset } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop } from "@freestyle/queue";
import {
  JOB_TYPES,
  type BackgroundRemovalJobPayload,
} from "@freestyle/shared";
import { getStorageAdapter } from "@freestyle/storage";

const removeBackground = async (imageUrl: string) => {
  const apiKey = process.env.BG_REMOVAL_API_KEY || process.env.REMOVE_BG_API_KEY;
  const endpoint = process.env.BG_REMOVAL_ENDPOINT || process.env.REMOVE_BG_ENDPOINT || "https://api.remove.bg/v1.0/removebg";
  const size = process.env.REMOVE_BG_SIZE || "auto";

  if (!apiKey) {
    const error = new Error("Background removal API key is missing.");
    error.name = "CUTOUT_NOT_AVAILABLE";
    throw error;
  }

  const form = new FormData();
  form.set("image_url", imageUrl);
  form.set("size", size);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Background removal failed (${response.status}): ${body.slice(0, 200)}`);
    error.name = "CUTOUT_NOT_AVAILABLE";
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
};

const main = async () => {
  await runWorkerLoop({
    workerName: process.env.WORKER_NAME || "worker_background_removal",
    jobTypes: [JOB_TYPES.BACKGROUND_REMOVAL_PROCESS],
    handler: async ({ job }) => {
      const payload = job.payload as unknown as BackgroundRemovalJobPayload;
      if (!payload.asset_id || !payload.image_url) {
        throw new Error("Invalid background removal job payload.");
      }

      try {
        const cutoutBuffer = await removeBackground(payload.image_url);
        const storage = getStorageAdapter();
        const key = `assets/${payload.asset_id}/cutout.png`;
        const uploaded = await storage.uploadBuffer(key, cutoutBuffer, "image/png");

        await updateAsset(payload.asset_id, {
          cutout_image_url: uploaded.url,
          mask_url: null,
          status: "pending",
        });

        const nextJob = await createJob({
          userId: job.user_id,
          jobType: JOB_TYPES.ASSET_PROCESSOR_PROCESS,
          payload: {
            asset_id: payload.asset_id,
            category_hint: payload.category_hint,
          },
        });

        return {
          asset_id: payload.asset_id,
          cutout_image_url: uploaded.url,
          next_job_id: nextJob.id,
        };
      } catch (error) {
        await updateAsset(payload.asset_id, { status: "failed" });
        throw error;
      }
    },
  });
};

main().catch((error) => {
  logger.error("worker.background_removal.crash", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});

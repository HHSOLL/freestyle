import { Worker } from "bullmq";
import IORedis from "ioredis";
import type { VtoJobData, VtoJobResult } from "../lib/vtoQueue";
import { requireRedisUrl, serverConfig } from "../lib/serverConfig";

const connection = new IORedis(requireRedisUrl(), {
  maxRetriesPerRequest: null,
});

const concurrency = serverConfig.vtoConcurrency;

const fetchAsDataUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch VTO image.");
  }
  const mime = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const pickString = (record: Record<string, unknown> | null, keys: string[]) => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
};

const extractImageFromResponse = async (payload: unknown) => {
  if (!payload) return null;

  const root = asRecord(payload);
  const output = asRecord(root?.output);
  const result = asRecord(root?.result);
  const data = asRecord(root?.data);

  const direct =
    pickString(root, ["imageDataUrl", "image_data_url"]) ||
    pickString(output, ["imageDataUrl", "image_data_url"]) ||
    pickString(result, ["imageDataUrl", "image_data_url"]) ||
    pickString(data, ["imageDataUrl", "image_data_url"]);

  if (direct) return direct;

  const url =
    pickString(root, ["imageUrl", "image_url"]) ||
    pickString(output, ["imageUrl", "image_url"]) ||
    pickString(result, ["imageUrl", "image_url"]) ||
    pickString(data, ["imageUrl", "image_url"]);

  if (url) {
    return fetchAsDataUrl(url);
  }

  return null;
};

const processJob = async (job: { data: VtoJobData }): Promise<VtoJobResult> => {
  const apiKey = serverConfig.vtoApiKey;
  const endpoint = serverConfig.vtoEndpoint;
  const authHeader = serverConfig.vtoAuthHeader;
  const authScheme = serverConfig.vtoAuthScheme;
  const provider = serverConfig.vtoProvider;

  if (!apiKey || !endpoint) {
    const result: VtoJobResult = {
      status: "not_configured",
      error: "VTO provider is not configured.",
    };
    return result;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  headers[authHeader] = authScheme ? `${authScheme} ${apiKey}` : apiKey;

  const payload = {
    provider,
    modelImage: job.data.modelImage,
    items: job.data.items,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `VTO request failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    return { status: "completed", imageDataUrl: dataUrl };
  }

  const payloadJson = await response.json();
  const imageDataUrl = await extractImageFromResponse(payloadJson);

  if (!imageDataUrl) {
    throw new Error("VTO response did not include an image.");
  }

  return { status: "completed", imageDataUrl };
};

const worker = new Worker<VtoJobData, VtoJobResult>("vto-tryon", processJob, {
  connection,
  concurrency,
});

worker.on("ready", () => {
  console.log("[VTO Worker] Ready.");
});

worker.on("failed", (job, error) => {
  console.error(`[VTO Worker] Job ${job?.id} failed:`, error);
});

worker.on("completed", (job, result) => {
  if (result?.status === "not_configured") {
    console.warn(`[VTO Worker] Job ${job.id} not configured.`);
  } else {
    console.log(`[VTO Worker] Job ${job.id} completed.`);
  }
});

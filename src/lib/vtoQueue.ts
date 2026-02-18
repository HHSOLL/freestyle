import { Queue } from "bullmq";
import IORedis from "ioredis";
import { requireRedisUrl } from "@/lib/serverConfig";

export type VtoJobData = {
  modelImage: string;
  items: Array<{ name: string; category?: string; imageSrc: string }>;
};

export type VtoJobResult = {
  status: "completed" | "not_configured";
  imageDataUrl?: string;
  error?: string;
};

const createRedisConnection = () =>
  new IORedis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

const globalForQueue = global as typeof global & {
  vtoQueue?: Queue<VtoJobData, VtoJobResult>;
  vtoRedis?: IORedis;
};

export const getVtoQueue = (): Queue<VtoJobData, VtoJobResult> => {
  if (!globalForQueue.vtoRedis) {
    globalForQueue.vtoRedis = createRedisConnection();
  }
  if (!globalForQueue.vtoQueue) {
    globalForQueue.vtoQueue = new Queue<VtoJobData, VtoJobResult>("vto-tryon", {
      connection: globalForQueue.vtoRedis,
    });
  }
  return globalForQueue.vtoQueue;
};

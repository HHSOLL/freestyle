import { Queue } from "bullmq";
import IORedis from "ioredis";
import { requireRedisUrl } from "@/lib/serverConfig";

export type BgRemovalJobData =
  | { mode: "file"; inputPath: string; mime: string }
  | { mode: "url"; sourceUrl: string };

export type BgRemovalJobResult = {
  outputPath: string;
  mime: string;
  removedBackground: boolean;
  warnings?: string[];
};

const createRedisConnection = () =>
  new IORedis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

const globalForQueue = global as typeof global & {
  bgRemovalQueue?: Queue<BgRemovalJobData, BgRemovalJobResult>;
  bgRemovalRedis?: IORedis;
};

export const getBgRemovalQueue = (): Queue<BgRemovalJobData, BgRemovalJobResult> => {
  if (!globalForQueue.bgRemovalRedis) {
    globalForQueue.bgRemovalRedis = createRedisConnection();
  }
  if (!globalForQueue.bgRemovalQueue) {
    globalForQueue.bgRemovalQueue = new Queue<BgRemovalJobData, BgRemovalJobResult>("bg-removal", {
      connection: globalForQueue.bgRemovalRedis,
    });
  }
  return globalForQueue.bgRemovalQueue;
};

import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { ImportAttemptLog, ImportImageCandidate } from "@/lib/assetImport";
import { requireRedisUrl } from "@/lib/serverConfig";

export type ImportJobAsset = {
  id: string;
  name: string;
  category: string;
  source: string;
  imageSrc: string;
  removedBackground: boolean;
  sourceUrl?: string;
  selectedImageUrl?: string;
  warnings?: string[];
  processing?: Record<string, unknown>;
};

export type ImportJobFailureItem = {
  url: string;
  error: string;
  code: string;
  attempts?: ImportAttemptLog[];
  candidates?: ImportImageCandidate[];
};

export type ImportJobData =
  | {
      type: "url";
      url: string;
      category: string;
      name?: string;
      sourceUrl?: string;
      selectedImageUrl?: string;
    }
  | {
      type: "cart";
      url: string;
      category: string;
      maxItems: number;
    }
  | {
      type: "file";
      filePath: string;
      mime: string;
      category: string;
      name?: string;
      sourceUrl?: string;
    };

export type ImportJobResult =
  | {
      type: "url";
      status: "completed";
      asset: ImportJobAsset;
      selectedImageUrl: string;
      warnings: string[];
      attempts?: ImportAttemptLog[];
    }
  | {
      type: "url";
      status: "failed";
      code: string;
      error: string;
      attempts?: ImportAttemptLog[];
      candidates?: ImportImageCandidate[];
    }
  | {
      type: "cart";
      status: "completed";
      assets: ImportJobAsset[];
      totalProducts: number;
      importedCount: number;
      failedCount: number;
      failed: ImportJobFailureItem[];
    }
  | {
      type: "cart";
      status: "failed";
      code: string;
      error: string;
      totalProducts: number;
      importedCount: 0;
      failedCount: number;
      failed: ImportJobFailureItem[];
    }
  | {
      type: "file";
      status: "completed";
      asset: ImportJobAsset;
      removedBackground: boolean;
      warnings: string[];
    }
  | {
      type: "file";
      status: "failed";
      code: string;
      error: string;
      warnings?: string[];
    };

const createRedisConnection = () =>
  new IORedis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

const globalForQueue = global as typeof global & {
  importQueue?: Queue<ImportJobData, ImportJobResult>;
  importRedis?: IORedis;
};

export const getImportQueue = (): Queue<ImportJobData, ImportJobResult> => {
  if (!globalForQueue.importRedis) {
    globalForQueue.importRedis = createRedisConnection();
  }
  if (!globalForQueue.importQueue) {
    globalForQueue.importQueue = new Queue<ImportJobData, ImportJobResult>("asset-import", {
      connection: globalForQueue.importRedis,
    });
  }
  return globalForQueue.importQueue;
};

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ASSET_STORAGE_PATH,
  mimeToExtension,
  readFileAsDataUrl,
  ensureAssetStorageDir,
} from "@/lib/assetProcessing";
import { assertFilesystemStorageAllowed, serverConfig } from "@/lib/serverConfig";

export type StoredAsset = {
  id: string;
  name: string;
  category: string;
  source: string;
  image_path: string;
  mime: string;
  removed_background: boolean;
  source_url?: string | null;
  selected_image_url?: string | null;
  processing?: Record<string, unknown> | null;
  warnings?: string[] | null;
  created_at: string;
};

export type AssetPayload = {
  name: string;
  category: string;
  source: string;
  imageDataUrl: string;
  removedBackground?: boolean;
  sourceUrl?: string | null;
  selectedImageUrl?: string | null;
  processing?: Record<string, unknown>;
  warnings?: string[];
};

const ASSET_INDEX_PATH = serverConfig.assetIndexPath || path.join(ASSET_STORAGE_PATH, "index.json");
const ASSET_INDEX_TEMP_SUFFIX = ".tmp";
let assetStoreLock: Promise<void> = Promise.resolve();

const ensureIndexDir = async () => {
  assertFilesystemStorageAllowed("asset index");
  await ensureAssetStorageDir();
  await fs.mkdir(path.dirname(ASSET_INDEX_PATH), { recursive: true });
};

const readIndex = async (): Promise<StoredAsset[]> => {
  await ensureIndexDir();
  try {
    const raw = await fs.readFile(ASSET_INDEX_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAsset[]) : [];
  } catch {
    return [];
  }
};

const writeIndex = async (records: StoredAsset[]) => {
  await ensureIndexDir();
  const tempPath = `${ASSET_INDEX_PATH}.${process.pid}.${crypto.randomUUID()}${ASSET_INDEX_TEMP_SUFFIX}`;
  await fs.writeFile(tempPath, JSON.stringify(records, null, 2));
  try {
    await fs.rename(tempPath, ASSET_INDEX_PATH);
  } catch {
    await fs.copyFile(tempPath, ASSET_INDEX_PATH);
    await fs.unlink(tempPath).catch(() => undefined);
  }
};

const withAssetStoreLock = async <T>(work: () => Promise<T>): Promise<T> => {
  const previous = assetStoreLock;
  let release: (() => void) | undefined;
  assetStoreLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await work();
  } finally {
    release?.();
  }
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL.");
  }
  return { mime: match[1], base64: match[2] };
};

export const saveAsset = async (payload: AssetPayload) => {
  const { mime, base64 } = parseDataUrl(payload.imageDataUrl);
  const extension = mimeToExtension(mime);
  const id = crypto.randomUUID();
  const filename = `asset-${id}.${extension}`;
  const filePath = path.join(ASSET_STORAGE_PATH, filename);
  const buffer = Buffer.from(base64, "base64");

  await ensureIndexDir();
  await fs.writeFile(filePath, buffer);

  const record: StoredAsset = {
    id,
    name: payload.name,
    category: payload.category,
    source: payload.source,
    image_path: filePath,
    mime,
    removed_background: Boolean(payload.removedBackground),
    source_url: payload.sourceUrl ?? null,
    selected_image_url: payload.selectedImageUrl ?? null,
    processing: payload.processing ?? null,
    warnings: Array.isArray(payload.warnings) && payload.warnings.length > 0 ? payload.warnings : null,
    created_at: new Date().toISOString(),
  };

  try {
    await withAssetStoreLock(async () => {
      const records = await readIndex();
      records.unshift(record);
      await writeIndex(records);
    });
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }

  return record;
};

export const listAssets = async () => {
  const records = await readIndex();
  const assets = await Promise.all(
    records.map(async (record) => {
      try {
        const imageDataUrl = await readFileAsDataUrl(record.image_path, record.mime);
        return {
          id: record.id,
          name: record.name,
          category: record.category,
          source: record.source,
          imageSrc: imageDataUrl,
          removedBackground: record.removed_background,
          sourceUrl: record.source_url ?? undefined,
          selectedImageUrl: record.selected_image_url ?? undefined,
          processing: record.processing ?? undefined,
          warnings: record.warnings ?? undefined,
          createdAt: record.created_at,
        };
      } catch {
        return null;
      }
    })
  );

  return assets.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
};

export const deleteAssetById = async (id: string) => {
  await withAssetStoreLock(async () => {
    const records = await readIndex();
    const nextRecords = records.filter((record) => record.id !== id);
    const target = records.find((record) => record.id === id);
    await writeIndex(nextRecords);

    if (target?.image_path) {
      await fs.unlink(target.image_path).catch(() => undefined);
    }
  });
};

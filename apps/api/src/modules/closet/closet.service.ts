import {
  deleteAssetByIdForUser,
  getAssetByIdForUser,
  updateAsset,
} from "@freestyle/db";
import {
  assetUpdateInputSchema,
  type AssetMetadata,
  type ClosetItem,
} from "@freestyle/shared";
import { listUserAssets } from "../assets/assets.service.js";

type AssetRecord = NonNullable<Awaited<ReturnType<typeof getAssetByIdForUser>>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeAssetMetadata = (current: unknown, incoming: AssetMetadata | undefined) => {
  const base = isRecord(current) ? current : {};
  if (!incoming) return base;

  const next: Record<string, unknown> = {
    ...base,
    ...incoming,
  };

  if (incoming.cutout) {
    next.cutout = {
      ...(isRecord(base.cutout) ? base.cutout : {}),
      ...incoming.cutout,
    };
  }

  if (incoming.measurements) {
    next.measurements = {
      ...(isRecord(base.measurements) ? base.measurements : {}),
      ...incoming.measurements,
    };
  }

  if (incoming.fitProfile) {
    next.fitProfile = {
      ...(isRecord(base.fitProfile) ? base.fitProfile : {}),
      ...incoming.fitProfile,
    };
  }

  if (incoming.garmentProfile) {
    next.garmentProfile = incoming.garmentProfile;
  }

  return next;
};

export const mapAssetRecordToClosetItem = (asset: AssetRecord): ClosetItem => ({
  id: asset.id,
  name: asset.name?.trim() || "Untitled garment",
  brand: asset.brand,
  category: asset.category,
  status: asset.status,
  heroImageUrl: asset.cutout_image_url || asset.thumbnail_medium_url || asset.original_image_url,
  originalImageUrl: asset.original_image_url,
  cutoutImageUrl: asset.cutout_image_url,
  sourceUrl: asset.source_url,
  metadata: asset.metadata,
  createdAt: asset.created_at,
  updatedAt: asset.updated_at,
});

export const listClosetItems = async (input: {
  userId: string;
  status?: "pending" | "ready" | "failed";
  category?: string;
  page?: number;
  pageSize?: number;
}) => {
  const result = await listUserAssets(input);
  return {
    ...result,
    items: result.items.map(mapAssetRecordToClosetItem),
  };
};

export const getClosetItem = async (userId: string, id: string) => {
  const asset = await getAssetByIdForUser(id, userId);
  return asset ? mapAssetRecordToClosetItem(asset) : null;
};

export const updateClosetItem = async (input: {
  userId: string;
  id: string;
  body: unknown;
}) => {
  const parsed = assetUpdateInputSchema.parse(input.body);
  const asset = await getAssetByIdForUser(input.id, input.userId);
  if (!asset) {
    return null;
  }

  const updated = await updateAsset(input.id, {
    category: parsed.category ?? asset.category,
    metadata: mergeAssetMetadata(asset.metadata, parsed.metadata),
  });

  return mapAssetRecordToClosetItem(updated);
};

export const deleteClosetItem = async (userId: string, id: string) => {
  await deleteAssetByIdForUser(id, userId);
};

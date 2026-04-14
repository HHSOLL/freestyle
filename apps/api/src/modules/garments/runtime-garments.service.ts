import {
  publishedGarmentAssetSchema,
  type AssetCategory,
  type GarmentPublicationRecord,
  type PublishedGarmentAsset,
} from "@freestyle/shared";
import {
  getPublishedRuntimeGarmentRecord,
  listPublishedRuntimeGarmentRecords,
  upsertPublishedRuntimeGarmentRecord,
} from "./runtime-garments.repository.js";

export const listPublishedRuntimeGarments = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
}) => listPublishedRuntimeGarmentRecords(filters);

export const getPublishedRuntimeGarmentById = async (id: string) =>
  getPublishedRuntimeGarmentRecord(id);

export const upsertPublishedRuntimeGarment = async (input: PublishedGarmentAsset) => {
  const parsed = publishedGarmentAssetSchema.parse(input);
  return upsertPublishedRuntimeGarmentRecord(parsed);
};

export const createPublishedRuntimeGarment = async (input: PublishedGarmentAsset) => {
  const parsed = publishedGarmentAssetSchema.parse(input);
  const existing = await getPublishedRuntimeGarmentRecord(parsed.id);
  if (existing) {
    return null;
  }
  return upsertPublishedRuntimeGarmentRecord(parsed);
};

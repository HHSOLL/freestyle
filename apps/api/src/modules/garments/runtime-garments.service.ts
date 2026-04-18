import {
  validatePublishedGarmentAsset,
} from "@freestyle/domain-garment";
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

export class RuntimeGarmentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues[0] ?? "Invalid runtime garment payload.");
    this.name = "RuntimeGarmentValidationError";
    this.issues = issues;
  }
}

const parsePublishedRuntimeGarment = (input: PublishedGarmentAsset) => {
  const parsed = publishedGarmentAssetSchema.parse(input);
  const issues = validatePublishedGarmentAsset(parsed);
  if (issues.length > 0) {
    throw new RuntimeGarmentValidationError(issues);
  }
  return parsed;
};

export const listPublishedRuntimeGarments = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
}) => listPublishedRuntimeGarmentRecords(filters);

export const getPublishedRuntimeGarmentById = async (id: string) =>
  getPublishedRuntimeGarmentRecord(id);

export const upsertPublishedRuntimeGarment = async (input: PublishedGarmentAsset) => {
  const parsed = parsePublishedRuntimeGarment(input);
  return upsertPublishedRuntimeGarmentRecord(parsed);
};

export const createPublishedRuntimeGarment = async (input: PublishedGarmentAsset) => {
  const parsed = parsePublishedRuntimeGarment(input);
  const existing = await getPublishedRuntimeGarmentRecord(parsed.id);
  if (existing) {
    return null;
  }
  return upsertPublishedRuntimeGarmentRecord(parsed);
};

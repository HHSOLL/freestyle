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

const safeParsePublishedRuntimeGarment = (input: unknown) => {
  const parsed = publishedGarmentAssetSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  return validatePublishedGarmentAsset(parsed.data).length === 0 ? parsed.data : null;
};

const parsePublishedRuntimeGarment = (input: unknown) => {
  const parsed = publishedGarmentAssetSchema.safeParse(input);
  if (!parsed.success) {
    throw new RuntimeGarmentValidationError(parsed.error.issues.map((issue) => issue.message));
  }
  const issues = validatePublishedGarmentAsset(parsed.data);
  if (issues.length > 0) {
    throw new RuntimeGarmentValidationError(issues);
  }
  return parsed.data;
};

export const listPublishedRuntimeGarments = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
}) => {
  const items = await listPublishedRuntimeGarmentRecords(filters);
  return items.flatMap((item) => {
    const parsed = safeParsePublishedRuntimeGarment(item);
    return parsed ? [parsed] : [];
  });
};

export const getPublishedRuntimeGarmentById = async (id: string) => {
  const item = await getPublishedRuntimeGarmentRecord(id);
  if (!item) {
    return null;
  }

  return safeParsePublishedRuntimeGarment(item);
};

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

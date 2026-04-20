import {
  assessGarmentInstantFit,
  validatePublishedGarmentAsset,
} from "@freestyle/domain-garment";
import {
  closetRuntimeGarmentItemSchema,
  publishedGarmentAssetSchema,
  type AssetCategory,
  type BodyProfile,
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

export const listClosetRuntimeGarments = async (
  bodyProfile: BodyProfile | null,
  filters?: {
    category?: AssetCategory;
    sourceSystem?: GarmentPublicationRecord["sourceSystem"];
  },
) => {
  const items = await listPublishedRuntimeGarments(filters);

  return items.flatMap((item) => {
    const parsed = closetRuntimeGarmentItemSchema.safeParse({
      item,
      instantFit: bodyProfile ? assessGarmentInstantFit(item, bodyProfile) : null,
    });

    return parsed.success ? [parsed.data] : [];
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

export const upsertPublishedRuntimeGarmentForActor = async (
  input: PublishedGarmentAsset,
  actorUserId?: string | null,
) => {
  const parsed = parsePublishedRuntimeGarment(input);
  return upsertPublishedRuntimeGarmentRecord(parsed, actorUserId);
};

export const createPublishedRuntimeGarment = async (
  input: PublishedGarmentAsset,
  actorUserId?: string | null,
) => {
  const parsed = parsePublishedRuntimeGarment(input);
  const existing = await getPublishedRuntimeGarmentRecord(parsed.id);
  if (existing) {
    return null;
  }
  return upsertPublishedRuntimeGarmentRecord(parsed, actorUserId);
};

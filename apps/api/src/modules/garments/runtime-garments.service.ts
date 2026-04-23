import {
  assessGarmentInstantFit,
  synchronizePublishedGarmentViewerManifest,
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

const normalizePublicationForRead = (publication: GarmentPublicationRecord): GarmentPublicationRecord => {
  const approvalState = publication.approvalState ?? "PUBLISHED";

  return {
    ...publication,
    approvalState,
    approvedAt: publication.approvedAt ?? (approvalState === "PUBLISHED" ? publication.publishedAt : undefined),
    certificationNotes: publication.certificationNotes ?? [],
  };
};

const normalizePublicationForWrite = (publication: GarmentPublicationRecord): GarmentPublicationRecord => ({
  ...publication,
  approvalState: publication.approvalState ?? "DRAFT",
  certificationNotes: publication.certificationNotes ?? [],
});

const normalizePublishedRuntimeGarmentForRead = (item: PublishedGarmentAsset): PublishedGarmentAsset =>
  synchronizePublishedGarmentViewerManifest(
    {
      ...item,
      publication: normalizePublicationForRead(item.publication),
    },
    { autofillMissing: false },
  );

const normalizePublishedRuntimeGarmentForWrite = (item: PublishedGarmentAsset): PublishedGarmentAsset =>
  synchronizePublishedGarmentViewerManifest(
    {
      ...item,
      publication: normalizePublicationForWrite(item.publication),
    },
    { autofillMissing: true },
  );

const isClosetVisibleRuntimeGarment = (item: PublishedGarmentAsset) =>
  item.publication.approvalState === "PUBLISHED";

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

  const normalized = normalizePublishedRuntimeGarmentForRead(parsed.data);
  return validatePublishedGarmentAsset(normalized).length === 0 ? normalized : null;
};

const parsePublishedRuntimeGarment = (input: unknown) => {
  const parsed = publishedGarmentAssetSchema.safeParse(input);
  if (!parsed.success) {
    throw new RuntimeGarmentValidationError(parsed.error.issues.map((issue) => issue.message));
  }
  const normalized = normalizePublishedRuntimeGarmentForWrite(parsed.data);
  const issues = validatePublishedGarmentAsset(normalized);
  if (issues.length > 0) {
    throw new RuntimeGarmentValidationError(issues);
  }
  return normalized;
};

export const listPublishedRuntimeGarments = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
  approvalState?: NonNullable<GarmentPublicationRecord["approvalState"]>;
}) => {
  const items = await listPublishedRuntimeGarmentRecords({
    category: filters?.category,
    sourceSystem: filters?.sourceSystem,
  });
  return items
    .flatMap((item) => {
      const parsed = safeParsePublishedRuntimeGarment(item);
      return parsed ? [parsed] : [];
    })
    .map(normalizePublishedRuntimeGarmentForRead)
    .filter((item) => (filters?.approvalState ? item.publication.approvalState === filters.approvalState : true));
};

export const listClosetRuntimeGarments = async (
  bodyProfile: BodyProfile | null,
  filters?: {
    category?: AssetCategory;
    sourceSystem?: GarmentPublicationRecord["sourceSystem"];
  },
) => {
  const items = (await listPublishedRuntimeGarments(filters)).filter(isClosetVisibleRuntimeGarment);

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

  const parsed = safeParsePublishedRuntimeGarment(item);
  return parsed ? normalizePublishedRuntimeGarmentForRead(parsed) : null;
};

export const upsertPublishedRuntimeGarment = async (input: PublishedGarmentAsset) => {
  const parsed = parsePublishedRuntimeGarment(input);
  return normalizePublishedRuntimeGarmentForRead(await upsertPublishedRuntimeGarmentRecord(parsed));
};

export const upsertPublishedRuntimeGarmentForActor = async (
  input: PublishedGarmentAsset,
  actorUserId?: string | null,
) => {
  const parsed = parsePublishedRuntimeGarment(input);
  return normalizePublishedRuntimeGarmentForRead(
    await upsertPublishedRuntimeGarmentRecord(parsed, actorUserId),
  );
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
  return normalizePublishedRuntimeGarmentForRead(
    await upsertPublishedRuntimeGarmentRecord(parsed, actorUserId),
  );
};

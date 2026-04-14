import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  publishedGarmentAssetSchema,
  type AssetCategory,
  type GarmentPublicationRecord,
  type PublishedGarmentAsset,
} from "@freestyle/shared";

const getRuntimeGarmentStorePath = () =>
  process.env.GARMENT_PUBLICATION_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".data", "runtime-garments.json");

const runtimeGarmentCatalogStoreSchema = z
  .object({
    version: z.literal(1).default(1),
    items: z.array(publishedGarmentAssetSchema).default([]),
  })
  .strict();

type RuntimeGarmentCatalogStore = z.infer<typeof runtimeGarmentCatalogStoreSchema>;

const dedupeAndSort = (items: PublishedGarmentAsset[]) => {
  const next = new Map<string, PublishedGarmentAsset>();
  items.forEach((item) => {
    next.set(item.id, item);
  });

  return Array.from(next.values()).sort((left, right) =>
    right.publication.publishedAt.localeCompare(left.publication.publishedAt),
  );
};

const readLegacyArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value.flatMap((entry) => {
    const result = publishedGarmentAssetSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });

  return {
    version: 1 as const,
    items: dedupeAndSort(parsed),
  } satisfies RuntimeGarmentCatalogStore;
};

const readStore = async () => {
  const runtimeGarmentStorePath = getRuntimeGarmentStorePath();

  try {
    const raw = await fs.readFile(runtimeGarmentStorePath, "utf8");
    const parsedJson = JSON.parse(raw) as unknown;
    const legacy = readLegacyArray(parsedJson);
    if (legacy) {
      return legacy;
    }

    const parsed = runtimeGarmentCatalogStoreSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { version: 1 as const, items: [] } satisfies RuntimeGarmentCatalogStore;
    }

    return {
      version: 1 as const,
      items: dedupeAndSort(parsed.data.items),
    } satisfies RuntimeGarmentCatalogStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1 as const, items: [] } satisfies RuntimeGarmentCatalogStore;
    }

    throw error;
  }
};

const writeStore = async (store: RuntimeGarmentCatalogStore) => {
  const runtimeGarmentStorePath = getRuntimeGarmentStorePath();
  await fs.mkdir(path.dirname(runtimeGarmentStorePath), { recursive: true });
  await fs.writeFile(
    runtimeGarmentStorePath,
    JSON.stringify(
      {
        version: 1,
        items: dedupeAndSort(store.items),
      } satisfies RuntimeGarmentCatalogStore,
      null,
      2,
    ),
    "utf8",
  );
};

export const listPublishedRuntimeGarmentRecords = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
}) => {
  const store = await readStore();
  return store.items.filter((item) => {
    if (filters?.category && item.category !== filters.category) {
      return false;
    }
    if (filters?.sourceSystem && item.publication.sourceSystem !== filters.sourceSystem) {
      return false;
    }
    return true;
  });
};

export const getPublishedRuntimeGarmentRecord = async (id: string) => {
  const store = await readStore();
  return store.items.find((item) => item.id === id) ?? null;
};

export const upsertPublishedRuntimeGarmentRecord = async (item: PublishedGarmentAsset) => {
  const parsed = publishedGarmentAssetSchema.parse(item);
  const store = await readStore();
  const nextItems = store.items.filter((entry) => entry.id !== parsed.id);
  nextItems.push(parsed);
  const nextStore = {
    version: 1 as const,
    items: nextItems,
  } satisfies RuntimeGarmentCatalogStore;
  await writeStore(nextStore);
  return parsed;
};

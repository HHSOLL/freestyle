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

const runtimeGarmentCatalogEnvelopeSchema = z
  .object({
    version: z.literal(1).default(1),
    items: z.array(z.unknown()).default([]),
  })
  .passthrough();

type RuntimeGarmentCatalogStore = {
  version: 1;
  items: PublishedGarmentAsset[];
};

export type PublishedRuntimeGarmentPersistencePort = {
  listPublishedRuntimeGarmentRecords: (filters?: {
    category?: AssetCategory;
    sourceSystem?: GarmentPublicationRecord["sourceSystem"];
  }) => Promise<PublishedGarmentAsset[]>;
  getPublishedRuntimeGarmentRecord: (id: string) => Promise<PublishedGarmentAsset | null>;
  upsertPublishedRuntimeGarmentRecord: (item: PublishedGarmentAsset) => Promise<PublishedGarmentAsset>;
};

const dedupeAndSort = (items: PublishedGarmentAsset[]) => {
  const next = new Map<string, PublishedGarmentAsset>();
  items.forEach((item) => {
    next.set(item.id, item);
  });

  return Array.from(next.values()).sort((left, right) =>
    right.publication.publishedAt.localeCompare(left.publication.publishedAt),
  );
};

const readPersistedItems = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const result = publishedGarmentAssetSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
};

const readLegacyArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }

  return {
    version: 1 as const,
    items: dedupeAndSort(readPersistedItems(value)),
  } satisfies RuntimeGarmentCatalogStore;
};

const filterItems = (
  items: PublishedGarmentAsset[],
  filters?: {
    category?: AssetCategory;
    sourceSystem?: GarmentPublicationRecord["sourceSystem"];
  },
) => {
  return items.filter((item) => {
    if (filters?.category && item.category !== filters.category) {
      return false;
    }
    if (filters?.sourceSystem && item.publication.sourceSystem !== filters.sourceSystem) {
      return false;
    }
    return true;
  });
};

export const createFilePublishedRuntimeGarmentPersistencePort = (options?: {
  storePath?: string;
}): PublishedRuntimeGarmentPersistencePort => {
  const resolveStorePath = () => options?.storePath?.trim() || getRuntimeGarmentStorePath();

  const readStoreFromPath = async () => {
    const runtimeGarmentStorePath = resolveStorePath();

    try {
      const raw = await fs.readFile(runtimeGarmentStorePath, "utf8");
      const parsedJson = JSON.parse(raw) as unknown;
      const legacy = readLegacyArray(parsedJson);
      if (legacy) {
        return legacy;
      }

      const parsed = runtimeGarmentCatalogEnvelopeSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return { version: 1 as const, items: [] } satisfies RuntimeGarmentCatalogStore;
      }

      return {
        version: 1 as const,
        items: dedupeAndSort(readPersistedItems(parsed.data.items)),
      } satisfies RuntimeGarmentCatalogStore;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1 as const, items: [] } satisfies RuntimeGarmentCatalogStore;
      }

      throw error;
    }
  };

  const writeStoreToPath = async (store: RuntimeGarmentCatalogStore) => {
    const runtimeGarmentStorePath = resolveStorePath();
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

  return {
    async listPublishedRuntimeGarmentRecords(filters) {
      const store = await readStoreFromPath();
      return filterItems(store.items, filters);
    },
    async getPublishedRuntimeGarmentRecord(id) {
      const store = await readStoreFromPath();
      return store.items.find((item) => item.id === id) ?? null;
    },
    async upsertPublishedRuntimeGarmentRecord(item) {
      const parsed = publishedGarmentAssetSchema.parse(item);
      const store = await readStoreFromPath();
      const nextItems = store.items.filter((entry) => entry.id !== parsed.id);
      nextItems.push(parsed);
      await writeStoreToPath({
        version: 1,
        items: nextItems,
      });
      return parsed;
    },
  };
};

export const createMemoryPublishedRuntimeGarmentPersistencePort = (
  initialItems?: PublishedGarmentAsset[],
): PublishedRuntimeGarmentPersistencePort => {
  const store = new Map<string, PublishedGarmentAsset>(
    dedupeAndSort(readPersistedItems(initialItems)).map((item) => [item.id, item]),
  );

  return {
    async listPublishedRuntimeGarmentRecords(filters) {
      return filterItems(dedupeAndSort(Array.from(store.values())), filters);
    },
    async getPublishedRuntimeGarmentRecord(id) {
      return store.get(id) ?? null;
    },
    async upsertPublishedRuntimeGarmentRecord(item) {
      const parsed = publishedGarmentAssetSchema.parse(item);
      store.set(parsed.id, parsed);
      return parsed;
    },
  };
};

const defaultPublishedRuntimeGarmentPersistencePort = createFilePublishedRuntimeGarmentPersistencePort();

export const listPublishedRuntimeGarmentRecords = async (filters?: {
  category?: AssetCategory;
  sourceSystem?: GarmentPublicationRecord["sourceSystem"];
}) => {
  return defaultPublishedRuntimeGarmentPersistencePort.listPublishedRuntimeGarmentRecords(filters);
};

export const getPublishedRuntimeGarmentRecord = async (id: string) => {
  return defaultPublishedRuntimeGarmentPersistencePort.getPublishedRuntimeGarmentRecord(id);
};

export const upsertPublishedRuntimeGarmentRecord = async (item: PublishedGarmentAsset) => {
  return defaultPublishedRuntimeGarmentPersistencePort.upsertPublishedRuntimeGarmentRecord(item);
};

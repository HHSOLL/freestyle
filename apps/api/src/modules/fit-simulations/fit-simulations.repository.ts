import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  bodyProfileSchema,
  fitSimulationRecordSchema,
  garmentFitAssessmentSchema,
  publishedGarmentAssetSchema,
  type BodyProfile,
  type FitSimulationRecord,
  type GarmentFitAssessment,
  type PublishedGarmentAsset,
} from "@freestyle/contracts";

const getFitSimulationStorePath = () =>
  process.env.FIT_SIMULATION_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".data", "fit-simulations.json");

const storedFitSimulationRecordSchema = fitSimulationRecordSchema
  .extend({
    userId: z.string().trim().min(1),
    bodyProfile: bodyProfileSchema,
    garmentSnapshot: publishedGarmentAssetSchema,
    fitAssessment: garmentFitAssessmentSchema.nullable(),
  })
  .strict();

const fitSimulationStoreEnvelopeSchema = z
  .object({
    version: z.literal(1).default(1),
    items: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

type StoredFitSimulationRecord = z.infer<typeof storedFitSimulationRecordSchema>;

type FitSimulationStoreShape = {
  version: 1;
  items: Record<string, StoredFitSimulationRecord>;
};

export type FitSimulationPersistencePort = {
  getFitSimulationRecordById: (id: string) => Promise<StoredFitSimulationRecord | null>;
  getFitSimulationRecordForUser: (id: string, userId: string) => Promise<StoredFitSimulationRecord | null>;
  upsertFitSimulationRecord: (record: StoredFitSimulationRecord) => Promise<StoredFitSimulationRecord>;
  deleteFitSimulationRecord: (id: string) => Promise<void>;
};

const emptyStore = (): FitSimulationStoreShape => ({
  version: 1,
  items: {},
});

const parseEntries = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([id, record]) => {
    const result = storedFitSimulationRecordSchema.safeParse(record);
    return result.success ? [[id, result.data] as const] : [];
  });
};

const readStoreFromPath = async (storePath: string) => {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const envelope = fitSimulationStoreEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      return emptyStore();
    }

    return {
      version: 1 as const,
      items: Object.fromEntries(parseEntries(envelope.data.items)),
    } satisfies FitSimulationStoreShape;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyStore();
    }

    throw error;
  }
};

const writeStoreToPath = async (storePath: string, store: FitSimulationStoreShape) => {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(
    storePath,
    JSON.stringify(
      {
        version: 1,
        items: store.items,
      } satisfies FitSimulationStoreShape,
      null,
      2,
    ),
    "utf8",
  );
};

export const createFileFitSimulationPersistencePort = (options?: {
  storePath?: string;
}): FitSimulationPersistencePort => {
  const resolveStorePath = () => options?.storePath?.trim() || getFitSimulationStorePath();

  return {
    async getFitSimulationRecordById(id) {
      const store = await readStoreFromPath(resolveStorePath());
      return store.items[id] ?? null;
    },
    async getFitSimulationRecordForUser(id, userId) {
      const store = await readStoreFromPath(resolveStorePath());
      const record = store.items[id] ?? null;
      return record?.userId === userId ? record : null;
    },
    async upsertFitSimulationRecord(record) {
      const parsed = storedFitSimulationRecordSchema.parse(record);
      const store = await readStoreFromPath(resolveStorePath());
      await writeStoreToPath(resolveStorePath(), {
        version: 1,
        items: {
          ...store.items,
          [parsed.id]: parsed,
        },
      });
      return parsed;
    },
    async deleteFitSimulationRecord(id) {
      const store = await readStoreFromPath(resolveStorePath());
      if (!(id in store.items)) {
        return;
      }
      const nextItems = { ...store.items };
      delete nextItems[id];
      await writeStoreToPath(resolveStorePath(), {
        version: 1,
        items: nextItems,
      });
    },
  };
};

export const createMemoryFitSimulationPersistencePort = (
  initialRecords?: Record<string, StoredFitSimulationRecord>,
): FitSimulationPersistencePort => {
  const store = new Map<string, StoredFitSimulationRecord>(parseEntries(initialRecords));

  return {
    async getFitSimulationRecordById(id) {
      return store.get(id) ?? null;
    },
    async getFitSimulationRecordForUser(id, userId) {
      const record = store.get(id) ?? null;
      return record?.userId === userId ? record : null;
    },
    async upsertFitSimulationRecord(record) {
      const parsed = storedFitSimulationRecordSchema.parse(record);
      store.set(parsed.id, parsed);
      return parsed;
    },
    async deleteFitSimulationRecord(id) {
      store.delete(id);
    },
  };
};

const defaultFitSimulationPersistencePort = createFileFitSimulationPersistencePort();

export const getFitSimulationRecordById = async (id: string) => {
  return defaultFitSimulationPersistencePort.getFitSimulationRecordById(id);
};

export const getFitSimulationRecordForUser = async (id: string, userId: string) => {
  return defaultFitSimulationPersistencePort.getFitSimulationRecordForUser(id, userId);
};

export const upsertFitSimulationRecord = async (record: {
  id: string;
  jobId: string | null;
  userId: string;
  status: FitSimulationRecord["status"];
  avatarVariantId: FitSimulationRecord["avatarVariantId"];
  bodyVersionId: string;
  garmentVariantId: string;
  avatarManifestUrl: string;
  garmentManifestUrl: string;
  materialPreset: string;
  qualityTier: FitSimulationRecord["qualityTier"];
  bodyProfile: BodyProfile;
  garmentSnapshot: PublishedGarmentAsset;
  fitAssessment: GarmentFitAssessment | null;
  instantFit: FitSimulationRecord["instantFit"];
  fitMap: FitSimulationRecord["fitMap"];
  fitMapSummary: FitSimulationRecord["fitMapSummary"];
  artifacts: FitSimulationRecord["artifacts"];
  metrics: FitSimulationRecord["metrics"];
  warnings: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}) => {
  return defaultFitSimulationPersistencePort.upsertFitSimulationRecord(record);
};

export const deleteFitSimulationRecord = async (id: string) => {
  return defaultFitSimulationPersistencePort.deleteFitSimulationRecord(id);
};

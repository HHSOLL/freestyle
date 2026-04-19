import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  bodyProfileRecordSchema,
  bodyProfileUpsertInputSchema,
} from "@freestyle/contracts";

const getBodyProfileStorePath = () =>
  process.env.BODY_PROFILE_STORE_PATH?.trim() || path.join(process.cwd(), ".data", "body-profiles.json");

const bodyProfileStoreEnvelopeSchema = z
  .object({
    version: z.literal(1).default(1),
    items: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

type BodyProfileRecord = z.infer<typeof bodyProfileRecordSchema>;
type BodyProfileUpsertInput = z.infer<typeof bodyProfileUpsertInputSchema>;

type BodyProfileStoreShape = {
  version: 1;
  items: Record<string, BodyProfileRecord>;
};

export type BodyProfilePersistencePort = {
  getBodyProfileRecordForUser: (userId: string) => Promise<BodyProfileRecord | null>;
  upsertBodyProfileRecordForUser: (userId: string, input: BodyProfileUpsertInput) => Promise<BodyProfileRecord>;
};

const emptyStore = (): BodyProfileStoreShape => ({
  version: 1,
  items: {},
});

const parseEntries = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([userId, record]) => {
    const result = bodyProfileRecordSchema.safeParse(record);
    return result.success ? [[userId, result.data] as const] : [];
  });
};

const readLegacyStore = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if ("version" in record && "items" in record) {
    return null;
  }

  return {
    version: 1 as const,
    items: Object.fromEntries(parseEntries(record)),
  } satisfies BodyProfileStoreShape;
};

const readStoreFromPath = async (bodyProfileStorePath: string) => {
  try {
    const raw = await fs.readFile(bodyProfileStorePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    const legacyStore = readLegacyStore(parsed);
    if (legacyStore) {
      return legacyStore;
    }

    const envelope = bodyProfileStoreEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      return emptyStore();
    }

    return {
      version: 1 as const,
      items: Object.fromEntries(parseEntries(envelope.data.items)),
    } satisfies BodyProfileStoreShape;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyStore();
    }

    throw error;
  }
};

const writeStoreToPath = async (bodyProfileStorePath: string, store: BodyProfileStoreShape) => {
  await fs.mkdir(path.dirname(bodyProfileStorePath), { recursive: true });
  await fs.writeFile(
    bodyProfileStorePath,
    JSON.stringify(
      {
        version: 1,
        items: store.items,
      } satisfies BodyProfileStoreShape,
      null,
      2,
    ),
    "utf8",
  );
};

export const createFileBodyProfilePersistencePort = (options?: {
  storePath?: string;
}): BodyProfilePersistencePort => {
  const resolveStorePath = () => options?.storePath?.trim() || getBodyProfileStorePath();

  return {
    async getBodyProfileRecordForUser(userId) {
      const store = await readStoreFromPath(resolveStorePath());
      return store.items[userId] ?? null;
    },
    async upsertBodyProfileRecordForUser(userId, input) {
      const parsed = bodyProfileUpsertInputSchema.parse(input);
      const store = await readStoreFromPath(resolveStorePath());
      const nextRecord: BodyProfileRecord = {
        profile: parsed.profile,
        version: 2,
        updatedAt: new Date().toISOString(),
      };

      await writeStoreToPath(resolveStorePath(), {
        version: 1,
        items: {
          ...store.items,
          [userId]: nextRecord,
        },
      });

      return nextRecord;
    },
  };
};

export const createMemoryBodyProfilePersistencePort = (
  initialRecords?: Record<string, BodyProfileRecord>,
): BodyProfilePersistencePort => {
  const store = new Map<string, BodyProfileRecord>(parseEntries(initialRecords));

  return {
    async getBodyProfileRecordForUser(userId) {
      return store.get(userId) ?? null;
    },
    async upsertBodyProfileRecordForUser(userId, input) {
      const parsed = bodyProfileUpsertInputSchema.parse(input);
      const nextRecord: BodyProfileRecord = {
        profile: parsed.profile,
        version: 2,
        updatedAt: new Date().toISOString(),
      };

      store.set(userId, nextRecord);
      return nextRecord;
    },
  };
};

const defaultBodyProfilePersistencePort = createFileBodyProfilePersistencePort();

export const getBodyProfileRecordForUser = async (userId: string) => {
  return defaultBodyProfilePersistencePort.getBodyProfileRecordForUser(userId);
};

export const upsertBodyProfileRecordForUser = async (userId: string, input: BodyProfileUpsertInput) => {
  return defaultBodyProfilePersistencePort.upsertBodyProfileRecordForUser(userId, input);
};

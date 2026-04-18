import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  bodyProfileRecordSchema,
  bodyProfileUpsertInputSchema,
} from "@freestyle/contracts";

const getBodyProfileStorePath = () =>
  process.env.BODY_PROFILE_STORE_PATH?.trim() || path.join(process.cwd(), ".data", "body-profiles.json");

type BodyProfileStoreShape = Record<string, BodyProfileRecord>;
type BodyProfileRecord = z.infer<typeof bodyProfileRecordSchema>;
type BodyProfileUpsertInput = z.infer<typeof bodyProfileUpsertInputSchema>;

const readStore = async () => {
  const bodyProfileStorePath = getBodyProfileStorePath();
  try {
    const raw = await fs.readFile(bodyProfileStorePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).flatMap(([userId, value]) => {
      const result = bodyProfileRecordSchema.safeParse(value);
      return result.success ? [[userId, result.data] as const] : [];
    });
    return new Map<string, BodyProfileRecord>(entries);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map<string, BodyProfileRecord>();
    }

    throw error;
  }
};

const writeStore = async (store: Map<string, BodyProfileRecord>) => {
  const bodyProfileStorePath = getBodyProfileStorePath();
  const payload = Object.fromEntries(store.entries()) satisfies BodyProfileStoreShape;
  await fs.mkdir(path.dirname(bodyProfileStorePath), { recursive: true });
  await fs.writeFile(bodyProfileStorePath, JSON.stringify(payload, null, 2), "utf8");
};

export const getBodyProfileRecordForUser = async (userId: string) => {
  const store = await readStore();
  return store.get(userId) ?? null;
};

export const upsertBodyProfileRecordForUser = async (userId: string, input: BodyProfileUpsertInput) => {
  const parsed = bodyProfileUpsertInputSchema.parse(input);
  const store = await readStore();
  const nextRecord: BodyProfileRecord = {
    profile: parsed.profile,
    version: 2,
    updatedAt: new Date().toISOString(),
  };

  store.set(userId, nextRecord);
  await writeStore(store);
  return nextRecord;
};

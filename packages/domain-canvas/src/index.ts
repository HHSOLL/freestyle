import { canvasCompositionListSchema, canvasCompositionSchema } from "@freestyle/contracts";
import type {
  BodyProfile,
  CanvasComposition,
  CanvasItem,
  ClosetSceneState,
} from "@freestyle/shared-types";
import { createId, readStoredJson, writeStoredJson } from "@freestyle/shared-utils";

export const canvasStorageKey = "freestyle:canvas-compositions:v1";
const maxCanvasCompositions = 24;

const normalizeCanvasComposition = (value: unknown): CanvasComposition | null => {
  const parsed = canvasCompositionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const requireCanvasComposition = (value: unknown, errorMessage: string): CanvasComposition => {
  const normalized = normalizeCanvasComposition(value);
  if (!normalized) {
    throw new Error(errorMessage);
  }

  return normalized;
};

const readStoredCanvasCompositions = (): CanvasComposition[] => {
  const stored = readStoredJson<unknown>(canvasStorageKey, []);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.flatMap((entry) => {
    const normalized = normalizeCanvasComposition(entry);
    return normalized ? [normalized] : [];
  });
};

export const createCanvasItem = (assetId: string, index: number): CanvasItem => ({
  id: createId("canvas-item"),
  assetId,
  kind: "garment",
  x: 120 + index * 16,
  y: 110 + index * 14,
  scale: 1,
  rotation: 0,
  zIndex: index,
});

export const createEmptyComposition = (input: {
  title: string;
  stageColor: string;
  bodyProfile: BodyProfile;
  closetState: ClosetSceneState;
  itemIds?: string[];
}): CanvasComposition => {
  const now = new Date().toISOString();
  return requireCanvasComposition(
    {
      version: 1,
      id: createId("composition"),
      title: input.title,
      stageColor: input.stageColor,
      createdAt: now,
      updatedAt: now,
      bodyProfile: input.bodyProfile,
      closetState: input.closetState,
      items: (input.itemIds ?? []).map((assetId, index) => createCanvasItem(assetId, index)),
    },
    "Failed to create a valid canvas composition",
  );
};

export const serializeComposition = (composition: CanvasComposition) =>
  JSON.stringify(requireCanvasComposition(composition, "Cannot serialize an invalid canvas composition"));

export const deserializeComposition = (raw: string): CanvasComposition | null => {
  try {
    return normalizeCanvasComposition(JSON.parse(raw));
  } catch {
    return null;
  }
};

export type CanvasCompositionRepository = {
  load: () => CanvasComposition[];
  saveAll: (items: CanvasComposition[]) => void;
  upsert: (item: CanvasComposition) => CanvasComposition[];
  remove: (id: string) => CanvasComposition[];
};

export const createLocalCanvasCompositionRepository = (): CanvasCompositionRepository => ({
  load: () => readStoredCanvasCompositions(),
  saveAll: (items) =>
    writeStoredJson(
      canvasStorageKey,
      canvasCompositionListSchema.parse(items).slice(0, maxCanvasCompositions),
    ),
  upsert: (item) => {
    const current = readStoredCanvasCompositions();
    const nextItem = requireCanvasComposition(item, "Cannot upsert an invalid canvas composition");
    const filtered = current.filter((entry) => entry.id !== nextItem.id);
    const next = [{ ...nextItem, updatedAt: new Date().toISOString() }, ...filtered].slice(0, maxCanvasCompositions);
    writeStoredJson(canvasStorageKey, next);
    return next;
  },
  remove: (id) => {
    const next = readStoredCanvasCompositions().filter((entry) => entry.id !== id);
    writeStoredJson(canvasStorageKey, next);
    return next;
  },
});

import type {
  BodyProfile,
  CanvasComposition,
  CanvasItem,
  ClosetSceneState,
} from "@freestyle/shared-types";
import { createId, readStoredJson, writeStoredJson } from "@freestyle/shared-utils";

export const canvasStorageKey = "freestyle:canvas-compositions:v1";

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
  return {
    version: 1,
    id: createId("composition"),
    title: input.title,
    stageColor: input.stageColor,
    createdAt: now,
    updatedAt: now,
    bodyProfile: input.bodyProfile,
    closetState: input.closetState,
    items: (input.itemIds ?? []).map((assetId, index) => createCanvasItem(assetId, index)),
  };
};

export const serializeComposition = (composition: CanvasComposition) => JSON.stringify(composition);

export const deserializeComposition = (raw: string): CanvasComposition | null => {
  try {
    const parsed = JSON.parse(raw) as CanvasComposition;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed;
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
  load: () => readStoredJson<CanvasComposition[]>(canvasStorageKey, []),
  saveAll: (items) => writeStoredJson(canvasStorageKey, items),
  upsert: (item) => {
    const current = readStoredJson<CanvasComposition[]>(canvasStorageKey, []);
    const filtered = current.filter((entry) => entry.id !== item.id);
    const next = [{ ...item, updatedAt: new Date().toISOString() }, ...filtered].slice(0, 24);
    writeStoredJson(canvasStorageKey, next);
    return next;
  },
  remove: (id) => {
    const next = readStoredJson<CanvasComposition[]>(canvasStorageKey, []).filter((entry) => entry.id !== id);
    writeStoredJson(canvasStorageKey, next);
    return next;
  },
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBodyProfile } from "@freestyle/shared-types";
import {
  createEmptyComposition,
  createLocalCanvasCompositionRepository,
  deserializeComposition,
  serializeComposition,
  canvasStorageKey,
} from "./index.js";

const createCanonicalComposition = () =>
  createEmptyComposition({
    title: "Studio composition",
    stageColor: "#eef1f4",
    bodyProfile: normalizeBodyProfile({
      simple: {
        heightCm: 171,
        shoulderCm: 43,
        chestCm: 94,
        waistCm: 76,
        hipCm: 99,
        inseamCm: 80,
      },
    }),
    closetState: {
      version: 1,
      avatarVariantId: "female-base",
      poseId: "neutral",
      activeCategory: "tops",
      selectedItemId: "starter-top-ivory-tee",
      equippedItemIds: { tops: "starter-top-ivory-tee" },
      qualityTier: "balanced",
    },
    itemIds: ["starter-top-ivory-tee", "starter-bottom-soft-denim"],
  });

test("canvas composition survives serialization", () => {
  const composition = createCanonicalComposition();

  const serialized = serializeComposition(composition);
  const hydrated = deserializeComposition(serialized);

  assert.ok(hydrated);
  assert.equal(hydrated?.items.length, 2);
  assert.equal(hydrated?.title, "Studio composition");
});

test("canvas deserialization drops malformed body profile snapshots", () => {
  const composition = createCanonicalComposition();
  const hydrated = deserializeComposition(
    JSON.stringify({
      ...composition,
      bodyProfile: {
        version: 2,
        detailed: { neckCm: 36 },
      },
    }),
  );

  assert.equal(hydrated, null);
});

test("canvas deserialization normalizes legacy flat body profile snapshots", () => {
  const composition = createCanonicalComposition();
  const hydrated = deserializeComposition(
    JSON.stringify({
      ...composition,
      bodyProfile: {
        heightCm: 171,
        shoulderCm: 43,
        chestCm: 94,
        waistCm: 76,
        hipCm: 99,
        inseamCm: 80,
        neckCm: 36,
      },
    }),
  );

  assert.ok(hydrated);
  assert.equal(hydrated?.bodyProfile.version, 2);
  assert.equal(hydrated?.bodyProfile.simple.heightCm, 171);
  assert.equal(hydrated?.bodyProfile.detailed?.neckCm, 36);
});

test("canvas deserialization drops invalid item coordinates", () => {
  const composition = createCanonicalComposition();
  const hydrated = deserializeComposition(
    JSON.stringify({
      ...composition,
      items: [
        {
          ...composition.items[0],
          x: "bad-x",
        },
      ],
    }),
  );

  assert.equal(hydrated, null);
});

test("canvas repository ignores malformed persisted compositions", () => {
  const previousWindow = globalThis.window;
  const storage = new Map<string, string>();
  const valid = createCanonicalComposition();
  storage.set(
    canvasStorageKey,
    JSON.stringify([
      valid,
      {
        ...valid,
        id: "broken-composition",
        closetState: {
          ...valid.closetState,
          qualityTier: "ultra",
        },
      },
    ]),
  );

  globalThis.window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
  } as unknown as Window & typeof globalThis;

  try {
    const repository = createLocalCanvasCompositionRepository();
    const loaded = repository.load();

    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.id, valid.id);
  } finally {
    if (previousWindow) {
      globalThis.window = previousWindow;
    } else {
      // @ts-expect-error test cleanup removes the temporary browser shim
      delete globalThis.window;
    }
  }
});

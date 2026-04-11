import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBodyProfile } from "@freestyle/shared-types";
import { createEmptyComposition, deserializeComposition, serializeComposition } from "./index.js";

test("canvas composition survives serialization", () => {
  const composition = createEmptyComposition({
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

  const serialized = serializeComposition(composition);
  const hydrated = deserializeComposition(serialized);

  assert.ok(hydrated);
  assert.equal(hydrated?.items.length, 2);
  assert.equal(hydrated?.title, "Studio composition");
});

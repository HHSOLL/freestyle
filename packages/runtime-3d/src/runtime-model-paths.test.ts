import test from "node:test";
import assert from "node:assert/strict";
import type { RuntimeGarmentAsset } from "@freestyle/shared-types";
import { collectRuntimeModelPaths } from "./runtime-model-paths.js";

const createRuntimeGarment = (overrides?: Partial<RuntimeGarmentAsset["runtime"]>) =>
  ({
    id: "starter-top",
    name: "Starter Top",
    imageSrc: "/assets/garments/top.png",
    category: "tops",
    source: "starter",
    palette: ["#ffffff"],
    runtime: {
      modelPath: "/assets/garments/default-top.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/female-top.glb",
        "male-base": "/assets/garments/male-top.glb",
      },
      skeletonProfileId: "freestyle-rig-v2",
      anchorBindings: [{ id: "leftShoulder", weight: 1 }],
      collisionZones: ["torso"],
      bodyMaskZones: ["torso"],
      surfaceClearanceCm: 1.2,
      renderPriority: 2,
      ...overrides,
    },
  }) satisfies RuntimeGarmentAsset;

test("collectRuntimeModelPaths dedupes avatar and garment runtime model paths", () => {
  const garment = createRuntimeGarment();

  assert.deepEqual(
    collectRuntimeModelPaths({
      avatarVariantIds: ["female-base", "female-base"],
      garmentAssets: [garment, garment],
      garmentVariantId: "female-base",
    }),
    ["/assets/avatars/mpfb-female-base.glb", "/assets/garments/female-top.glb"],
  );
});

test("collectRuntimeModelPaths falls back to the default garment model path when no variant override exists", () => {
  const garment = createRuntimeGarment({
    modelPathByVariant: {
      "female-base": "/assets/garments/female-top.glb",
    },
  });

  assert.deepEqual(
    collectRuntimeModelPaths({
      avatarVariantIds: ["male-base"],
      garmentAssets: [garment],
      garmentVariantId: "male-base",
    }),
    ["/assets/avatars/mpfb-male-base.glb", "/assets/garments/default-top.glb"],
  );
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import type { PublishedGarmentAsset } from "@freestyle/contracts";
import {
  createFilePublishedRuntimeGarmentPersistencePort,
  createMemoryPublishedRuntimeGarmentPersistencePort,
} from "./runtime-garments.repository.js";

const createPublishedGarmentFixture = (
  overrides?: Partial<PublishedGarmentAsset>,
): PublishedGarmentAsset => ({
  id: "published-top-precision-tee",
  name: "Precision Tee",
  imageSrc: "/assets/demo/precision-tee.png",
  category: "tops",
  brand: "Partner Sample",
  source: "inventory",
  metadata: {
    measurements: {
      chestCm: 58.5,
      shoulderCm: 52.5,
      sleeveLengthCm: 21,
      lengthCm: 65.5,
    },
    fitProfile: {
      layer: "base",
      silhouette: "regular",
      structure: "soft",
      stretch: 0.08,
      drape: 0.18,
    },
    selectedSizeLabel: "L",
  },
  runtime: {
    modelPath: "/assets/garments/partner/precision-tee.glb",
    skeletonProfileId: "freestyle-rig-v2",
    anchorBindings: [
      { id: "leftShoulder", weight: 0.3 },
      { id: "rightShoulder", weight: 0.3 },
    ],
    collisionZones: ["torso", "arms"],
    bodyMaskZones: [],
    surfaceClearanceCm: 1.2,
    renderPriority: 1,
  },
  palette: ["#f5f5f5", "#10161f"],
  publication: {
    sourceSystem: "admin-domain",
    publishedAt: "2026-04-14T12:00:00.000Z",
    assetVersion: "precision-tee@1.0.0",
    measurementStandard: "body-garment-v1",
  },
  ...overrides,
});

test("memory runtime-garment persistence port filters, isolates, and upserts canonical items", async () => {
  const top = createPublishedGarmentFixture();
  const shoe = createPublishedGarmentFixture({
    id: "published-shoe-city-sneaker",
    name: "City Sneaker",
    category: "shoes",
    publication: {
      ...createPublishedGarmentFixture().publication,
      publishedAt: "2026-04-15T12:00:00.000Z",
      assetVersion: "city-sneaker@1.0.0",
    },
  });

  const port = createMemoryPublishedRuntimeGarmentPersistencePort([top]);
  assert.equal((await port.getPublishedRuntimeGarmentRecord(top.id))?.name, "Precision Tee");
  assert.equal((await port.listPublishedRuntimeGarmentRecords({ category: "tops" })).length, 1);
  assert.equal((await port.listPublishedRuntimeGarmentRecords({ category: "shoes" })).length, 0);

  await port.upsertPublishedRuntimeGarmentRecord(shoe);

  const allItems = await port.listPublishedRuntimeGarmentRecords();
  assert.deepEqual(
    allItems.map((item) => item.id),
    [shoe.id, top.id],
  );
});

test("file runtime-garment persistence port reads legacy arrays and filters malformed rows", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-runtime-garment-repo-"));
  const storePath = path.join(tempDir, "runtime-garments.json");
  const valid = createPublishedGarmentFixture();
  fs.writeFileSync(
    storePath,
    JSON.stringify([valid, { id: "broken-row", name: "Broken Row" }], null, 2),
    "utf8",
  );

  const port = createFilePublishedRuntimeGarmentPersistencePort({ storePath });
  const items = await port.listPublishedRuntimeGarmentRecords();
  assert.deepEqual(
    items.map((item) => item.id),
    [valid.id],
  );
  assert.equal(await port.getPublishedRuntimeGarmentRecord("broken-row"), null);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("file runtime-garment persistence port writes a versioned envelope for future adapter replacement", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-runtime-garment-repo-"));
  const storePath = path.join(tempDir, "runtime-garments.json");
  const port = createFilePublishedRuntimeGarmentPersistencePort({ storePath });
  const valid = createPublishedGarmentFixture();

  await port.upsertPublishedRuntimeGarmentRecord(valid);

  const raw = JSON.parse(fs.readFileSync(storePath, "utf8")) as {
    version?: unknown;
    items?: PublishedGarmentAsset[];
  };
  assert.equal(raw.version, 1);
  assert.equal(raw.items?.[0]?.id, valid.id);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

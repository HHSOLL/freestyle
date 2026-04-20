import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLegacyCompatibleAssetInsert,
  isLegacyAssetsColumnDriftError,
  normalizeAssetRecord,
} from "./assets-schema-compat.js";

test("asset schema drift detection only matches optional legacy columns on assets", () => {
  assert.equal(
    isLegacyAssetsColumnDriftError("Could not find the 'brand' column of 'assets' in the schema cache"),
    true,
  );
  assert.equal(
    isLegacyAssetsColumnDriftError("Could not find the 'metadata' column of 'assets' in the schema cache"),
    true,
  );
  assert.equal(
    isLegacyAssetsColumnDriftError("Could not find the 'brand' column of 'products' in the schema cache"),
    false,
  );
  assert.equal(isLegacyAssetsColumnDriftError("new row violates row-level security policy"), false);
});

test("legacy asset insert strips post-migration optional columns", () => {
  assert.deepEqual(
    buildLegacyCompatibleAssetInsert({
      user_id: "user-1",
      product_id: "product-1",
      name: "Smoke top",
      brand: "FreeStyle",
      source_url: "https://cdn.example.com/top.png",
      original_image_url: "https://cdn.example.com/original.png",
      category: "tops",
      metadata: {
        sourceBrand: "FreeStyle",
      },
      status: "pending",
    }),
    {
      user_id: "user-1",
      product_id: "product-1",
      original_image_url: "https://cdn.example.com/original.png",
      category: "tops",
      status: "pending",
    },
  );
});

test("asset record normalization backfills missing optional fields", () => {
  const createdAt = new Date().toISOString();
  const normalized = normalizeAssetRecord({
    id: "asset-1",
    user_id: "user-1",
    product_id: null,
    original_image_url: "https://cdn.example.com/original.png",
    cutout_image_url: null,
    mask_url: null,
    thumbnail_small_url: null,
    thumbnail_medium_url: null,
    category: "tops",
    embedding_model: null,
    perceptual_hash: null,
    status: "pending",
    created_at: createdAt,
    updated_at: createdAt,
  });

  assert.equal(normalized.name, null);
  assert.equal(normalized.brand, null);
  assert.equal(normalized.source_url, null);
  assert.equal(normalized.metadata, null);
});

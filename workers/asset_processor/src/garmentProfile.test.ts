import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { buildGarmentProfile, inferAssetCategory } from "./garmentProfile.js";

const svgToBuffer = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

test("inferAssetCategory normalizes category hints and source URLs", () => {
  assert.equal(inferAssetCategory("outerwear", "https://example.com/item"), "outerwear");
  assert.equal(inferAssetCategory(undefined, "https://shop.example.com/products/wool-jacket"), "outerwear");
  assert.equal(inferAssetCategory(undefined, "https://shop.example.com/products/wide-pants"), "bottoms");
  assert.equal(inferAssetCategory(undefined, "https://shop.example.com/products/unknown"), "custom");
});

test("buildGarmentProfile extracts normalized bounds and silhouette samples", async () => {
  const input = await svgToBuffer(`
    <svg width="160" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="240" fill="transparent"/>
      <rect x="44" y="24" width="72" height="168" rx="10" fill="white"/>
    </svg>
  `);

  const profile = await buildGarmentProfile(input, "tops");
  assert.ok(profile);
  assert.equal(profile?.version, 1);
  assert.equal(profile?.category, "tops");
  assert.ok(profile!.bbox.width >= 70 && profile!.bbox.width <= 74);
  assert.ok(profile!.bbox.height >= 166 && profile!.bbox.height <= 170);
  assert.ok(profile!.normalizedBounds.width > 0.4 && profile!.normalizedBounds.width < 0.5);
  assert.equal(profile!.silhouetteSamples.length, 9);
});

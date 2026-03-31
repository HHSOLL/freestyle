import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { createHeuristicCutout, hasMeaningfulAlpha, postProcessCutout } from "./cutout.js";

const createSolidImage = async (
  width: number,
  height: number,
  fill: { r: number; g: number; b: number; a: number },
  foreground?: { left: number; top: number; width: number; height: number; color: { r: number; g: number; b: number; a: number } }
) => {
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const isForeground =
        foreground &&
        x >= foreground.left &&
        x < foreground.left + foreground.width &&
        y >= foreground.top &&
        y < foreground.top + foreground.height;
      const color = isForeground ? foreground.color : fill;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = color.a;
    }
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
};

test("hasMeaningfulAlpha detects transparent assets", async () => {
  const transparentAsset = await createSolidImage(
    120,
    160,
    { r: 255, g: 255, b: 255, a: 0 },
    {
      left: 24,
      top: 18,
      width: 72,
      height: 110,
      color: { r: 38, g: 40, b: 48, a: 255 },
    }
  );

  assert.equal(await hasMeaningfulAlpha(transparentAsset), true);
});

test("heuristic cutout removes a light border background and passes trim quality", async () => {
  const borderedAsset = await createSolidImage(
    220,
    240,
    { r: 250, g: 246, b: 240, a: 255 },
    {
      left: 62,
      top: 36,
      width: 92,
      height: 168,
      color: { r: 42, g: 72, b: 110, a: 255 },
    }
  );

  const cutout = await createHeuristicCutout(borderedAsset);
  const processed = await postProcessCutout(cutout);

  assert.equal(processed.quality.pass, true);
  assert.ok(processed.trimRect.width < 220);
  assert.ok(processed.trimRect.height < 240);
  assert.ok(processed.quality.alphaAreaRatio > 0.15);
});

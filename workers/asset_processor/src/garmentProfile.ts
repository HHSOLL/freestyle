import sharp from "sharp";
import type { GarmentProfile } from "@freestyle/shared";

const sampleRatios = [0.08, 0.16, 0.24, 0.32, 0.42, 0.52, 0.64, 0.78, 0.9] as const;
const knownCategories = new Set(["tops", "bottoms", "outerwear", "shoes", "accessories", "custom"]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sampleWidthRatio = (
  samples: GarmentProfile["silhouetteSamples"],
  lower: number,
  upper: number,
  fallback = 0
) => {
  const selected = samples
    .filter((sample) => sample.yRatio >= lower && sample.yRatio <= upper)
    .map((sample) => sample.widthRatio);
  return selected.length > 0 ? average(selected) : fallback;
};

export const inferAssetCategory = (hint: string | undefined, sourceUrl: string) => {
  const normalizedHint = hint?.trim().toLowerCase();
  if (normalizedHint && knownCategories.has(normalizedHint)) {
    return normalizedHint;
  }

  const lower = `${normalizedHint ?? ""} ${sourceUrl}`.toLowerCase();
  if (/(coat|jacket|blazer|cardigan|parka|jumper|outer)/.test(lower)) return "outerwear";
  if (/(pants|trouser|denim|jean|skirt|shorts|legging|bottom)/.test(lower)) return "bottoms";
  if (/(shoe|sneaker|loafer|boot|heel|sandal)/.test(lower)) return "shoes";
  if (/(bag|cap|hat|belt|scarf|glove|watch|ring|necklace|accessor)/.test(lower)) return "accessories";
  if (/(tee|shirt|hoodie|knit|sweater|top|blouse|dress|vest)/.test(lower)) return "tops";
  return "custom";
};

export const buildGarmentProfile = async (buffer: Buffer, category: string): Promise<GarmentProfile | null> => {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (!width || !height || channels < 4) return null;

  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3] ?? 0;
      if (alpha < 10) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) return null;

  const bboxWidth = right - left + 1;
  const bboxHeight = bottom - top + 1;
  const normalizedBounds = {
    left: left / width,
    top: top / height,
    width: bboxWidth / width,
    height: bboxHeight / height,
    centerX: (left + bboxWidth / 2) / width,
  };

  const silhouetteSamples = sampleRatios.map((ratio) => {
    const sampleY = clamp(Math.round(top + bboxHeight * ratio), top, bottom);
    let rowLeft = right;
    let rowRight = left;

    for (let x = left; x <= right; x += 1) {
      const alpha = data[(sampleY * width + x) * channels + 3] ?? 0;
      if (alpha < 10) continue;
      if (x < rowLeft) rowLeft = x;
      if (x > rowRight) rowRight = x;
    }

    if (rowRight < rowLeft) {
      return {
        yRatio: ratio,
        widthRatio: 0,
        centerRatio: normalizedBounds.centerX,
      };
    }

    const rowWidth = rowRight - rowLeft + 1;
    return {
      yRatio: ratio,
      widthRatio: rowWidth / width,
      centerRatio: (rowLeft + rowWidth / 2) / width,
    };
  });

  const widthProfile = {
    shoulderRatio: sampleWidthRatio(silhouetteSamples, 0.05, 0.22, normalizedBounds.width),
    chestRatio: sampleWidthRatio(silhouetteSamples, 0.22, 0.44, normalizedBounds.width),
    waistRatio: sampleWidthRatio(silhouetteSamples, 0.44, 0.62, normalizedBounds.width),
    hipRatio: sampleWidthRatio(silhouetteSamples, 0.58, 0.78, normalizedBounds.width),
    hemRatio: sampleWidthRatio(silhouetteSamples, 0.78, 0.98, normalizedBounds.width),
  };

  return {
    version: 1,
    category,
    image: { width, height },
    bbox: {
      left,
      top,
      width: bboxWidth,
      height: bboxHeight,
    },
    normalizedBounds,
    silhouetteSamples,
    coverage: {
      topRatio: normalizedBounds.top,
      bottomRatio: normalizedBounds.top + normalizedBounds.height,
      lengthRatio: normalizedBounds.height,
    },
    widthProfile,
  };
};

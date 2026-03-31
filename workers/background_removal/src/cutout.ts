import sharp from "sharp";

export type CutoutQualityReason =
  | "FOREGROUND_TOO_SMALL"
  | "FOREGROUND_TOO_LARGE"
  | "BBOX_TOO_LARGE"
  | "TRIM_SIZE_TOO_SMALL"
  | null;

export type CutoutQuality = {
  pass: boolean;
  reason: CutoutQualityReason;
  alphaAreaRatio: number;
  bboxAreaRatio: number;
  nonTransparentPixels: number;
  totalPixels: number;
  bbox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type PostProcessedCutout = {
  buffer: Buffer;
  mime: "image/png";
  quality: CutoutQuality;
  trimRect: {
    left: number;
    top: number;
    width: number;
    height: number;
    padding: number;
  };
  originalSize: {
    width: number;
    height: number;
  };
};

export type CutoutTrimOptions = {
  alphaThreshold?: number;
  minAlphaAreaRatio?: number;
  maxAlphaAreaRatio?: number;
  maxBboxAreaRatio?: number;
  minTrimSizePx?: number;
  paddingPx?: number;
};

const defaultOptions: Required<CutoutTrimOptions> = {
  alphaThreshold: 12,
  minAlphaAreaRatio: 0.012,
  maxAlphaAreaRatio: 0.92,
  maxBboxAreaRatio: 0.9,
  minTrimSizePx: 64,
  paddingPx: 18,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const distance = (r: number, g: number, b: number, background: { r: number; g: number; b: number }) => {
  const dr = r - background.r;
  const dg = g - background.g;
  const db = b - background.b;
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
};

const getIndex = (x: number, y: number, width: number, channels: number) => (y * width + x) * channels;

const getCornerSamples = (
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  patchSize: number
) => {
  const samples: Array<{ r: number; g: number; b: number }> = [];
  const corners = [
    { startX: 0, endX: patchSize, startY: 0, endY: patchSize },
    { startX: Math.max(0, width - patchSize), endX: width, startY: 0, endY: patchSize },
    { startX: 0, endX: patchSize, startY: Math.max(0, height - patchSize), endY: height },
    {
      startX: Math.max(0, width - patchSize),
      endX: width,
      startY: Math.max(0, height - patchSize),
      endY: height,
    },
  ];

  for (const corner of corners) {
    for (let y = corner.startY; y < corner.endY; y += 1) {
      for (let x = corner.startX; x < corner.endX; x += 1) {
        const index = getIndex(x, y, width, channels);
        const alpha = data[index + 3] ?? 0;
        if (alpha < 8) continue;
        samples.push({
          r: data[index] ?? 0,
          g: data[index + 1] ?? 0,
          b: data[index + 2] ?? 0,
        });
      }
    }
  }

  return samples;
};

export const hasMeaningfulAlpha = async (inputBuffer: Buffer) => {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const totalPixels = info.width * info.height;
  let nonOpaquePixels = 0;

  for (let index = 3; index < data.length; index += info.channels) {
    if ((data[index] ?? 255) < 245) {
      nonOpaquePixels += 1;
    }
  }

  return totalPixels > 0 && nonOpaquePixels / totalPixels > 0.005;
};

export const createHeuristicCutout = async (inputBuffer: Buffer) => {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgba = Buffer.from(data);
  const patchSize = clamp(Math.round(Math.min(width, height) * 0.08), 8, 24);
  const samples = getCornerSamples(rgba, width, height, channels, patchSize);

  if (samples.length === 0) {
    return sharp(rgba, { raw: { width, height, channels } }).png().toBuffer();
  }

  const background = samples.reduce(
    (acc, sample) => ({
      r: acc.r + sample.r,
      g: acc.g + sample.g,
      b: acc.b + sample.b,
    }),
    { r: 0, g: 0, b: 0 }
  );

  background.r /= samples.length;
  background.g /= samples.length;
  background.b /= samples.length;

  const sampleDistances = samples.map((sample) => distance(sample.r, sample.g, sample.b, background));
  const meanDistance = sampleDistances.reduce((sum, value) => sum + value, 0) / sampleDistances.length;
  const variance =
    sampleDistances.reduce((sum, value) => sum + Math.pow(value - meanDistance, 2), 0) /
    sampleDistances.length;
  const threshold = clamp(meanDistance + Math.sqrt(variance) * 3 + 14, 12, 82);

  const visited = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const enqueue = (x: number, y: number) => {
    const position = y * width + x;
    if (visited[position]) return;
    visited[position] = 1;
    queue.push([x, y]);
  };

  const isBackgroundCandidate = (x: number, y: number) => {
    const index = getIndex(x, y, width, channels);
    const alpha = rgba[index + 3] ?? 0;
    if (alpha < 8) return true;
    return distance(rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0, background) <= threshold;
  };

  for (let x = 0; x < width; x += 1) {
    if (isBackgroundCandidate(x, 0)) enqueue(x, 0);
    if (isBackgroundCandidate(x, height - 1)) enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    if (isBackgroundCandidate(0, y)) enqueue(0, y);
    if (isBackgroundCandidate(width - 1, y)) enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift() as [number, number];
    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nextX, nextY] of neighbors) {
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
      const position = nextY * width + nextX;
      if (visited[position]) continue;
      if (!isBackgroundCandidate(nextX, nextY)) continue;
      visited[position] = 1;
      queue.push([nextX, nextY]);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = y * width + x;
      const index = getIndex(x, y, width, channels);
      if (visited[position]) {
        rgba[index + 3] = 0;
        continue;
      }

      const alpha = rgba[index + 3] ?? 0;
      if (alpha < 8) {
        rgba[index + 3] = 0;
        continue;
      }

      const pixelDistance = distance(rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0, background);
      const featheredAlpha = clamp(
        Math.round(((pixelDistance - threshold * 0.45) / (threshold * 0.75)) * 255),
        0,
        255
      );
      rgba[index + 3] = Math.max(alpha, featheredAlpha);
    }
  }

  return sharp(rgba, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toBuffer();
};

const buildQuality = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  nonTransparentPixels: number,
  width: number,
  height: number,
  options: Required<CutoutTrimOptions>
): CutoutQuality => {
  const bboxWidth = right >= left ? right - left + 1 : 0;
  const bboxHeight = bottom >= top ? bottom - top + 1 : 0;
  const totalPixels = width * height;
  const alphaAreaRatio = totalPixels > 0 ? nonTransparentPixels / totalPixels : 0;
  const bboxAreaRatio = totalPixels > 0 ? (bboxWidth * bboxHeight) / totalPixels : 0;

  let reason: CutoutQualityReason = null;
  if (alphaAreaRatio < options.minAlphaAreaRatio) reason = "FOREGROUND_TOO_SMALL";
  else if (alphaAreaRatio > options.maxAlphaAreaRatio) reason = "FOREGROUND_TOO_LARGE";
  else if (bboxAreaRatio > options.maxBboxAreaRatio) reason = "BBOX_TOO_LARGE";
  else if (bboxWidth < options.minTrimSizePx || bboxHeight < options.minTrimSizePx) reason = "TRIM_SIZE_TOO_SMALL";

  return {
    pass: reason === null,
    reason,
    alphaAreaRatio,
    bboxAreaRatio,
    nonTransparentPixels,
    totalPixels,
    bbox: {
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: bboxWidth,
      height: bboxHeight,
    },
  };
};

export const mapCutoutQualityReasonToErrorCode = (reason: CutoutQualityReason) => {
  if (reason === "BBOX_TOO_LARGE" || reason === "FOREGROUND_TOO_LARGE") {
    return "ONLY_MODEL_IMAGES_FOUND";
  }

  return "CUTOUT_QUALITY_TOO_LOW";
};

export const postProcessCutout = async (
  inputBuffer: Buffer,
  overrides: CutoutTrimOptions = {}
): Promise<PostProcessedCutout> => {
  const options = {
    ...defaultOptions,
    ...overrides,
  };

  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  let nonTransparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = getIndex(x, y, width, channels);
      const alpha = data[index + 3] ?? 0;
      if (alpha < options.alphaThreshold) continue;

      nonTransparentPixels += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (nonTransparentPixels === 0 || right < left || bottom < top) {
    return {
      buffer: await image.png().toBuffer(),
      mime: "image/png",
      quality: buildQuality(0, 0, -1, -1, 0, width, height, options),
      trimRect: {
        left: 0,
        top: 0,
        width,
        height,
        padding: 0,
      },
      originalSize: {
        width,
        height,
      },
    };
  }

  const quality = buildQuality(left, top, right, bottom, nonTransparentPixels, width, height, options);
  const paddedLeft = clamp(left - options.paddingPx, 0, width - 1);
  const paddedTop = clamp(top - options.paddingPx, 0, height - 1);
  const paddedRight = clamp(right + options.paddingPx, 0, width - 1);
  const paddedBottom = clamp(bottom + options.paddingPx, 0, height - 1);
  const trimWidth = paddedRight - paddedLeft + 1;
  const trimHeight = paddedBottom - paddedTop + 1;

  return {
    buffer: await image
      .extract({
        left: paddedLeft,
        top: paddedTop,
        width: trimWidth,
        height: trimHeight,
      })
      .png()
      .toBuffer(),
    mime: "image/png",
    quality,
    trimRect: {
      left: paddedLeft,
      top: paddedTop,
      width: trimWidth,
      height: trimHeight,
      padding: options.paddingPx,
    },
    originalSize: {
      width,
      height,
    },
  };
};

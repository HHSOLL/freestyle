import test from 'node:test';
import assert from 'node:assert/strict';
import type { Asset } from '@/features/studio/types';
import { buildGarmentLayerConfig, buildFittingLayers, defaultBodyProfile, resolveGarmentMeasurements } from './fitting';

const topAsset: Asset = {
  id: 'top-1',
  name: 'Relaxed Shirt',
  imageSrc: 'https://example.com/top.png',
  category: 'tops',
  source: 'import',
  metadata: {
    originalSize: { width: 900, height: 1200 },
    measurements: {
      chestCm: 112,
      waistCm: 104,
      shoulderCm: 47,
      sleeveLengthCm: 63,
      lengthCm: 74,
    },
    fitProfile: {
      layer: 'mid',
      silhouette: 'relaxed',
    },
    dominantColor: '#998877',
  },
};

const outerwearAsset: Asset = {
  id: 'outerwear-1',
  name: 'Wool Coat',
  imageSrc: 'https://example.com/coat.png',
  category: 'outerwear',
  source: 'import',
  metadata: {
    measurements: {
      chestCm: 124,
      waistCm: 118,
      shoulderCm: 49,
      lengthCm: 108,
      sleeveLengthCm: 65,
    },
    fitProfile: {
      layer: 'outer',
      silhouette: 'oversized',
    },
    dominantColor: '#554433',
  },
};

const bottomAsset: Asset = {
  id: 'bottom-1',
  name: 'Straight Denim',
  imageSrc: 'https://example.com/bottom.png',
  category: 'bottoms',
  source: 'import',
  metadata: {
    measurements: {
      waistCm: 86,
      hipCm: 104,
      inseamCm: 81,
      hemCm: 42,
      lengthCm: 109,
    },
    dominantColor: '#445566',
  },
};

const profiledTopAsset: Asset = {
  ...topAsset,
  id: 'top-2',
  garmentProfile: {
    version: 1,
    category: 'tops',
    image: { width: 900, height: 1200 },
    bbox: { left: 180, top: 140, width: 540, height: 880 },
    normalizedBounds: {
      left: 0.2,
      top: 0.12,
      width: 0.6,
      height: 0.73,
      centerX: 0.5,
    },
    silhouetteSamples: [
      { yRatio: 0.16, widthRatio: 0.52, centerRatio: 0.5 },
      { yRatio: 0.38, widthRatio: 0.56, centerRatio: 0.5 },
      { yRatio: 0.68, widthRatio: 0.48, centerRatio: 0.5 },
    ],
    coverage: {
      topRatio: 0.12,
      bottomRatio: 0.85,
      lengthRatio: 0.73,
    },
    widthProfile: {
      shoulderRatio: 0.6,
      chestRatio: 0.58,
      waistRatio: 0.48,
      hipRatio: 0.42,
      hemRatio: 0.46,
    },
  },
};

test('resolveGarmentMeasurements prefers explicit metadata over inferred values', () => {
  const measurements = resolveGarmentMeasurements(topAsset, defaultBodyProfile);
  assert.equal(measurements.chestCm, 112);
  assert.equal(measurements.lengthCm, 74);
});

test('buildGarmentLayerConfig reflects oversized outerwear with larger shell size', () => {
  const config = buildGarmentLayerConfig(outerwearAsset, defaultBodyProfile);
  assert.equal(config.layerOrder, 3);
  assert.equal(config.fitSummary[0]?.severity, 'oversized');
  assert.ok(config.shellWidth > 1.1);
  assert.ok(config.shellHeight > 1.5);
});

test('buildGarmentLayerConfig derives pants geometry from hip and inseam measurements', () => {
  const config = buildGarmentLayerConfig(bottomAsset, defaultBodyProfile);
  assert.equal(config.category, 'bottoms');
  assert.ok((config.limbLength ?? 0) > 1.4);
  assert.ok((config.fitSummary[0]?.easeCm ?? 0) > 0);
});

test('garment profile data changes rendered shell proportions', () => {
  const config = buildGarmentLayerConfig(profiledTopAsset, defaultBodyProfile);
  assert.ok(config.shellWidth > 1.2);
  assert.ok((config.limbWidth ?? 0) > 0.45);
  assert.ok(config.shellHeight > 1.15);
});

test('buildFittingLayers preserves layering order base -> mid -> outer', () => {
  const layers = buildFittingLayers([outerwearAsset, bottomAsset, topAsset], defaultBodyProfile);
  assert.deepEqual(
    layers.map((layer) => layer.assetId),
    ['bottom-1', 'top-1', 'outerwear-1']
  );
});

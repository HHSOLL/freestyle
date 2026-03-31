import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGarmentLayerConfig, buildFittingLayers, defaultBodyProfile, resolveGarmentMeasurements } from './fitting';
import type { Asset } from './types';

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

test('buildFittingLayers preserves layering order base -> mid -> outer', () => {
  const layers = buildFittingLayers([outerwearAsset, bottomAsset, topAsset], defaultBodyProfile);
  assert.deepEqual(
    layers.map((layer) => layer.assetId),
    ['bottom-1', 'top-1', 'outerwear-1']
  );
});

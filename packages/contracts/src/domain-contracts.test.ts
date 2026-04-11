import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assetMetadataSchema,
  bodyProfileSchema,
  bodyProfileRecordSchema,
  bodyProfileSimpleSchema,
  legacyBodyProfileFlatSchema,
  bodyProfileUpsertInputSchema,
  garmentFitProfileSchema,
  garmentMeasurementsSchema,
  normalizeBodyProfile,
} from './index.js';

test('bodyProfileSchema accepts canonical simple+detailed envelope', () => {
  const parsed = bodyProfileSchema.parse({
    simple: {
      heightCm: 172,
      shoulderCm: 44,
      chestCm: 94,
      waistCm: 78,
      hipCm: 95,
      inseamCm: 79,
    },
  });

  assert.equal(parsed.simple.heightCm, 172);
  assert.equal(parsed.simple.inseamCm, 79);
});

test('bodyProfileSchema accepts detailed optional extension fields inside envelope', () => {
  const parsed = bodyProfileSchema.parse({
    simple: {
      heightCm: 170,
      shoulderCm: 43,
      chestCm: 92,
      waistCm: 76,
      hipCm: 93,
      inseamCm: 78,
    },
    detailed: {
      neckCm: 37,
      thighCm: 54,
      calfCm: 36,
      armLengthCm: 61,
    },
  });

  assert.equal(parsed.detailed?.neckCm, 37);
  assert.equal(parsed.detailed?.thighCm, 54);
  assert.equal(parsed.detailed?.armLengthCm, 61);
});

test('legacyBodyProfileFlatSchema accepts legacy flat payloads and normalizes to canonical shape', () => {
  const parsed = legacyBodyProfileFlatSchema.parse({
    heightCm: 170,
    shoulderCm: 43,
    chestCm: 92,
    waistCm: 76,
    hipCm: 93,
    inseamCm: 78,
    neckCm: 37,
    thighCm: 54,
    calfCm: 36,
    armLengthCm: 61,
  });
  const normalized = normalizeBodyProfile(parsed);

  assert.equal(normalized.simple.heightCm, 170);
  assert.equal(normalized.detailed?.neckCm, 37);
  assert.equal(normalized.detailed?.thighCm, 54);
  assert.equal(normalized.detailed?.armLengthCm, 61);
});

test('body profile reservation schemas parse reserved payloads', () => {
  const upsert = bodyProfileUpsertInputSchema.parse({
    profile: {
      simple: {
        heightCm: 172,
        shoulderCm: 44,
        chestCm: 94,
        waistCm: 78,
        hipCm: 95,
        inseamCm: 79,
      },
    },
  });
  const record = bodyProfileRecordSchema.parse({
    profile: upsert.profile,
    version: 1,
    updatedAt: new Date().toISOString(),
  });

  assert.equal(record.version, 1);
  assert.equal(record.profile.simple.waistCm, 78);
});

test('garment measurement + fit profile schemas stay backward-compatible', () => {
  const measurements = garmentMeasurementsSchema.parse({
    chestCm: 112,
    waistCm: 104,
    sleeveLengthCm: 63,
    lengthCm: 74,
  });
  const fitProfile = garmentFitProfileSchema.parse({
    silhouette: 'relaxed',
    layer: 'mid',
    stretch: 0.2,
    drape: 0.5,
  });

  assert.equal(measurements.chestCm, 112);
  assert.equal(fitProfile.layer, 'mid');
});

test('asset metadata schema accepts garment-facing metadata payloads', () => {
  const parsed = assetMetadataSchema.parse({
    sourceTitle: 'Tailored jacket',
    originalSize: {
      width: 1200,
      height: 1600,
    },
    measurements: {
      chestCm: 108,
      sleeveLengthCm: 62,
    },
    fitProfile: {
      silhouette: 'relaxed',
      layer: 'outer',
    },
    dominantColor: '#112233',
  });

  assert.equal(parsed.originalSize?.width, 1200);
  assert.equal(parsed.fitProfile?.layer, 'outer');
});

test('bodyProfileSimpleSchema keeps required simple fields explicit', () => {
  const parsed = bodyProfileSimpleSchema.parse({
    heightCm: 172,
    shoulderCm: 44,
    chestCm: 94,
    waistCm: 78,
    hipCm: 95,
    inseamCm: 79,
  });

  assert.equal(parsed.heightCm, 172);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bodyProfileSchema,
  bodyProfileRecordSchema,
  bodyProfileUpsertInputSchema,
  garmentFitProfileSchema,
  garmentMeasurementsSchema,
} from './index.js';

test('bodyProfileSchema accepts simple profile payload', () => {
  const parsed = bodyProfileSchema.parse({
    heightCm: 172,
    shoulderCm: 44,
    chestCm: 94,
    waistCm: 78,
    hipCm: 95,
    inseamCm: 79,
  });

  assert.equal(parsed.heightCm, 172);
  assert.equal(parsed.inseamCm, 79);
});

test('bodyProfileSchema accepts detailed optional extension fields', () => {
  const parsed = bodyProfileSchema.parse({
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

  assert.equal(parsed.neckCm, 37);
  assert.equal(parsed.thighCm, 54);
  assert.equal(parsed.armLengthCm, 61);
});

test('body profile reservation schemas parse reserved payloads', () => {
  const upsert = bodyProfileUpsertInputSchema.parse({
    profile: {
      heightCm: 172,
      shoulderCm: 44,
      chestCm: 94,
      waistCm: 78,
      hipCm: 95,
      inseamCm: 79,
    },
  });
  const record = bodyProfileRecordSchema.parse({
    profile: upsert.profile,
    version: 1,
    updatedAt: new Date().toISOString(),
  });

  assert.equal(record.version, 1);
  assert.equal(record.profile.waistCm, 78);
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

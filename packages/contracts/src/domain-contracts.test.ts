import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  accessoryAuthoringSummarySchema,
  assetAuthoringSummarySchemaVersion,
  avatarMeasurementsSidecarSchemaVersion,
  avatarMeasurementsSidecarSchema,
  assetMetadataSchema,
  canvasCompositionSchema,
  canvasLookCreateResponseSchema,
  canvasLookDataSchema,
  canvasLookDeleteResponseSchema,
  canvasLookGetResponseSchema,
  canvasLookInputSchema,
  canvasLookListResponseSchema,
  canvasLookRecordSchema,
  bodyProfileGetResponseSchema,
  bodyProfilePutResponseSchema,
  bodyProfileSchema,
  bodyProfileRecordSchema,
  bodyProfileSimpleSchema,
  closetSceneStateSchema,
  closetRuntimeGarmentListResponseSchema,
  legacyBodyProfileFlatSchema,
  bodyProfileUpsertInputSchema,
  garmentFitAssessmentSchema,
  garmentFitOverallSchema,
  garmentInstantFitReportSchema,
  garmentFitProfileSchema,
  garmentFitStateSchema,
  garmentMeasurementsSchema,
  garmentPatternSpecSchema,
  garmentPatternSpecSchemaVersion,
  fitCalibrationReportSchema,
  fitMapArtifactDataSchema,
  fitSimulationCreateResponseSchema,
  fitSimulationGetResponseSchema,
  fitSimulateHQJobType,
  fitSimulateHQRequestSchema,
  fitSimulateHQResultEnvelopeSchema,
  garmentAuthoringSummarySchema,
  normalizeBodyProfile,
  hairAuthoringSummarySchema,
  publishedGarmentAssetSchema,
  publishedRuntimeGarmentItemResponseSchema,
  publishedRuntimeGarmentListResponseSchema,
  runtimeAssetAuthoringSummarySchema,
  runtimeGarmentAssetSchema,
} from './index.js';

const readJsonFixture = (relativePath: string) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

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
      headCircumferenceCm: 56,
    },
  });

  assert.equal(parsed.detailed?.neckCm, 37);
  assert.equal(parsed.detailed?.thighCm, 54);
  assert.equal(parsed.detailed?.armLengthCm, 61);
  assert.equal(parsed.detailed?.headCircumferenceCm, 56);
});

test('bodyProfileSchema accepts current product metadata fields inside the envelope', () => {
  const parsed = bodyProfileSchema.parse({
    version: 2,
    gender: 'female',
    bodyFrame: 'balanced',
    simple: {
      heightCm: 170,
      shoulderCm: 43,
      chestCm: 92,
      waistCm: 76,
      hipCm: 93,
      inseamCm: 78,
    },
  });

  assert.equal(parsed.version, 2);
  assert.equal(parsed.gender, 'female');
  assert.equal(parsed.bodyFrame, 'balanced');
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
    headCircumferenceCm: 56,
  });
  const normalized = normalizeBodyProfile(parsed);

  assert.equal(normalized.simple.heightCm, 170);
  assert.equal(normalized.detailed?.neckCm, 37);
  assert.equal(normalized.detailed?.thighCm, 54);
  assert.equal(normalized.detailed?.armLengthCm, 61);
  assert.equal(normalized.detailed?.headCircumferenceCm, 56);
});

test('body profile product schemas accept current web payloads and normalize stored records', () => {
  const upsert = bodyProfileUpsertInputSchema.parse({
    profile: {
      version: 2,
      gender: 'female',
      bodyFrame: 'balanced',
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
  const getResponse = bodyProfileGetResponseSchema.parse({
    bodyProfile: record,
  });
  const putResponse = bodyProfilePutResponseSchema.parse({
    bodyProfile: record,
  });

  assert.equal(record.version, 2);
  assert.equal(record.profile.simple.waistCm, 78);
  assert.equal(record.profile.gender, 'female');
  assert.equal(record.profile.bodyFrame, 'balanced');
  assert.equal(getResponse.bodyProfile?.version, 2);
  assert.equal(putResponse.bodyProfile.version, 2);
});

test('body profile upsert schema accepts legacy flat payloads and normalizes them', () => {
  const parsed = bodyProfileUpsertInputSchema.parse({
    profile: {
      heightCm: 170,
      shoulderCm: 43,
      chestCm: 92,
      waistCm: 76,
      hipCm: 93,
      inseamCm: 78,
      neckCm: 37,
    },
  });

  assert.equal(parsed.profile.version, 2);
  assert.equal(parsed.profile.simple.heightCm, 170);
  assert.equal(parsed.profile.detailed?.neckCm, 37);
});

test('avatarMeasurementsSidecarSchema accepts the committed authoring artifact shape', () => {
  const parsed = avatarMeasurementsSidecarSchema.parse({
    schemaVersion: avatarMeasurementsSidecarSchemaVersion,
    variantId: 'female-base',
    authoringSource: 'mpfb2',
    units: 'mm',
    buildProvenance: {
      mpfb: {
        revision: '7053847edd62a09dfe1ec6209d69a425435195c4',
      },
    },
    referenceMeasurementsMm: {
      statureMm: 1639,
      shoulderWidthMm: 313,
      armLengthMm: 491,
      inseamMm: 784,
      torsoLengthMm: 432,
      hipWidthMm: 196,
    },
    referenceMeasurementsMmDerivation: {
      kind: 'geometry-derived-reference',
      intendedUse: 'authoring-qa',
      sourceObjectName: 'mpfb-female-base.body.fullbody',
      sourceRigName: 'mpfb-female-base',
      measurements: {
        statureMm: {
          method: 'object-bounding-box-height',
          objectName: 'mpfb-female-base.body.fullbody',
        },
        shoulderWidthMm: {
          method: 'bone-head-distance',
          bones: ['upperarm_l', 'upperarm_r'],
        },
        armLengthMm: {
          method: 'bone-chain-length',
          bones: ['upperarm_l', 'lowerarm_l', 'hand_l'],
        },
        inseamMm: {
          method: 'bone-chain-length',
          bones: ['thigh_l', 'calf_l'],
        },
        torsoLengthMm: {
          method: 'bone-chain-length',
          bones: ['spine_01', 'spine_02', 'spine_03', 'neck_01'],
        },
        hipWidthMm: {
          method: 'bone-head-distance',
          bones: ['thigh_l', 'thigh_r'],
        },
      },
    },
    segmentationVertexCounts: {
      torso: 2898,
      arms: 5098,
      hips: 666,
      legs: 2546,
      feet: 2864,
      exposed: 5086,
    },
  });

  assert.equal(parsed.variantId, 'female-base');
  assert.equal(parsed.referenceMeasurementsMmDerivation.measurements.armLengthMm.method, 'bone-chain-length');
});

test('avatarMeasurementsSidecarSchema rejects missing derivation blocks', () => {
  assert.throws(
    () =>
      avatarMeasurementsSidecarSchema.parse({
        schemaVersion: avatarMeasurementsSidecarSchemaVersion,
        variantId: 'male-base',
        authoringSource: 'mpfb2',
        units: 'mm',
        buildProvenance: {
          mpfb: {
            revision: '7053847edd62a09dfe1ec6209d69a425435195c4',
          },
        },
        referenceMeasurementsMm: {
          statureMm: 1782,
          shoulderWidthMm: 393,
          armLengthMm: 566,
          inseamMm: 889,
          torsoLengthMm: 381,
          hipWidthMm: 221,
        },
        referenceMeasurementsMmDerivation: {
          kind: 'geometry-derived-reference',
          intendedUse: 'authoring-qa',
          sourceObjectName: 'mpfb-male-base.body.fullbody',
          sourceRigName: 'mpfb-male-base',
          measurements: {
            statureMm: {
              method: 'object-bounding-box-height',
              objectName: 'mpfb-male-base.body.fullbody',
            },
          },
        },
        segmentationVertexCounts: {
          torso: 1,
        },
      }),
    /shoulderWidthMm/,
  );
});

test('avatarMeasurementsSidecarSchema accepts committed MPFB measurements sidecar files', () => {
  const female = avatarMeasurementsSidecarSchema.parse(
    readJsonFixture('../../../authoring/avatar/exports/raw/mpfb-female-base.measurements.json'),
  );
  const male = avatarMeasurementsSidecarSchema.parse(
    readJsonFixture('../../../authoring/avatar/exports/raw/mpfb-male-base.measurements.json'),
  );

  assert.equal(female.schemaVersion, avatarMeasurementsSidecarSchemaVersion);
  assert.equal(female.variantId, 'female-base');
  assert.equal(male.schemaVersion, avatarMeasurementsSidecarSchemaVersion);
  assert.equal(male.variantId, 'male-base');
});

test('fitCalibrationReportSchema accepts the committed calibration artifact shape', () => {
  const fixture = readJsonFixture('./__fixtures__/fit-calibration-report.json');
  const parsed = fitCalibrationReportSchema.parse(fixture);

  assert.equal(parsed.schemaVersion, 'fit-calibration-report.v1');
  assert.ok(parsed.avatarCalibrationReferences.length > 0);
  assert.ok(parsed.garments.length > 0);
});

test('fitSimulateHQRequestSchema accepts the reserved offline simulation request contract', () => {
  const parsed = fitSimulateHQRequestSchema.parse({
    jobType: fitSimulateHQJobType,
    schemaVersion: 'fit-simulate-hq.v1',
    bodyVersionId: 'body-profile:user-1:2026-04-20T10:00:00.000Z',
    garmentVariantId: 'starter-top-soft-casual',
    avatarManifestUrl: 'https://cdn.freestyle.test/assets/avatars/female-base.glb',
    garmentManifestUrl: 'https://cdn.freestyle.test/assets/garments/soft-casual.glb',
    materialPreset: 'cotton_woven_light',
    qualityTier: 'balanced',
  });

  assert.equal(parsed.jobType, fitSimulateHQJobType);
  assert.equal(parsed.qualityTier, 'balanced');
});

test('fitSimulateHQResultEnvelopeSchema accepts canonical simulation result envelopes', () => {
  const parsed = fitSimulateHQResultEnvelopeSchema.parse({
    schema_version: 'job-result.v1',
    job_type: fitSimulateHQJobType,
    trace_id: '00000000-0000-4000-8000-000000000023',
    progress: 100,
    artifacts: [
      {
        kind: 'draped_glb',
        url: 'https://cdn.freestyle.test/jobs/fit/draped.glb',
      },
      {
        kind: 'fit_map_json',
        url: 'https://cdn.freestyle.test/jobs/fit/fit-map.json',
      },
      {
        kind: 'preview_png',
        url: 'https://cdn.freestyle.test/jobs/fit/preview.png',
      },
    ],
    metrics: {
      durationMs: 120000,
      penetrationRate: 0.012,
      maxStretchRatio: 1.08,
    },
    warnings: [],
    data: {
      schemaVersion: 'fit-simulate-hq.v1',
      bodyVersionId: 'body-profile:user-1:2026-04-20T10:00:00.000Z',
      garmentVariantId: 'starter-top-soft-casual',
      qualityTier: 'high',
    },
  });

  assert.equal(parsed.artifacts[0]?.kind, 'draped_glb');
  assert.equal(parsed.metrics.durationMs, 120000);
});

test('fitSimulation response schemas accept the active lab record shape', () => {
  const created = fitSimulationCreateResponseSchema.parse({
    job_id: '00000000-0000-4000-8000-000000000024',
    fit_simulation_id: '00000000-0000-4000-8000-000000000025',
  });

  const read = fitSimulationGetResponseSchema.parse({
    fitSimulation: {
      id: '00000000-0000-4000-8000-000000000025',
      jobId: '00000000-0000-4000-8000-000000000024',
      status: 'queued',
      avatarVariantId: 'female-base',
      bodyVersionId: 'body-profile:user-1:2026-04-20T10:00:00.000Z',
      garmentVariantId: 'starter-top-soft-casual',
      avatarManifestUrl: 'https://freestyle.local/assets/avatars/mpfb-female-base.glb',
      garmentManifestUrl: 'https://freestyle.local/assets/garments/starter/top-soft-casual.glb',
      materialPreset: 'knit_medium',
      qualityTier: 'balanced',
      instantFit: null,
      artifacts: [],
      metrics: null,
      warnings: [],
      errorMessage: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
      completedAt: null,
    },
  });

  assert.equal(created.fit_simulation_id, '00000000-0000-4000-8000-000000000025');
  assert.equal(read.fitSimulation.materialPreset, 'knit_medium');
});

test('fitMapArtifactDataSchema accepts typed overlay evidence for phase e overlays', () => {
  const parsed = fitMapArtifactDataSchema.parse({
    schemaVersion: 'fit-map-json.v1',
    generatedAt: '2026-04-20T10:00:00.000Z',
    fitSimulationId: '00000000-0000-4000-8000-000000000025',
    request: {
      bodyVersionId: 'body-profile:user-1:2026-04-20T10:00:00.000Z',
      garmentVariantId: 'starter-top-soft-casual',
      avatarVariantId: 'female-base',
      avatarManifestUrl: 'https://freestyle.local/assets/avatars/mpfb-female-base.glb',
      garmentManifestUrl: 'https://freestyle.local/assets/garments/starter/top-soft-casual.glb',
      materialPreset: 'knit_medium',
      qualityTier: 'balanced',
    },
    garment: {
      id: 'starter-top-soft-casual',
      name: 'Soft Tucked Tee',
      category: 'tops',
    },
    fitAssessment: {
      sizeLabel: 'L',
      overallState: 'snug',
      tensionRisk: 'medium',
      clippingRisk: 'medium',
      stretchLoad: 0.76,
      limitingKeys: ['chestCm', 'waistCm'],
      dimensions: [
        {
          key: 'chestCm',
          measurementMode: 'body-circumference',
          garmentCm: 108,
          bodyCm: 104,
          effectiveGarmentCm: 110,
          easeCm: 6,
          requiredStretchRatio: 0.02,
          state: 'snug',
        },
        {
          key: 'waistCm',
          measurementMode: 'body-circumference',
          garmentCm: 92,
          bodyCm: 88,
          effectiveGarmentCm: 94,
          easeCm: 6,
          requiredStretchRatio: 0.01,
          state: 'regular',
        },
      ],
    },
    instantFit: {
      schemaVersion: 'garment-instant-fit-report.v1',
      sizeLabel: 'L',
      overallFit: 'tight',
      overallState: 'snug',
      tensionRisk: 'medium',
      clippingRisk: 'medium',
      confidence: 0.74,
      primaryRegionId: 'chest',
      summary: {
        ko: 'L · 가슴 기준 타이트함',
        en: 'L · Chest tight fit',
      },
      explanations: [
        {
          ko: '가슴 여유가 제한적이다.',
          en: 'Chest ease is limited.',
        },
      ],
      limitingKeys: ['chestCm', 'waistCm'],
      regions: [
        {
          regionId: 'chest',
          measurementKey: 'chestCm',
          fitState: 'snug',
          easeCm: 6,
          isLimiting: true,
        },
        {
          regionId: 'waist',
          measurementKey: 'waistCm',
          fitState: 'regular',
          easeCm: 6,
          isLimiting: true,
        },
      ],
    },
    overlays: [
      {
        kind: 'easeMap',
        overallScore: 0.44,
        maxRegionScore: 0.51,
        regions: [
          {
            regionId: 'chest',
            measurementKey: 'chestCm',
            score: 0.51,
            fitState: 'snug',
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
          {
            regionId: 'waist',
            measurementKey: 'waistCm',
            score: 0.37,
            fitState: 'regular',
            easeCm: 6,
            requiredStretchRatio: 0.01,
            isLimiting: true,
          },
        ],
      },
      {
        kind: 'stretchMap',
        overallScore: 0.2,
        maxRegionScore: 0.25,
        regions: [
          {
            regionId: 'chest',
            measurementKey: 'chestCm',
            score: 0.25,
            fitState: 'snug',
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
          {
            regionId: 'waist',
            measurementKey: 'waistCm',
            score: 0.15,
            fitState: 'regular',
            easeCm: 6,
            requiredStretchRatio: 0.01,
            isLimiting: true,
          },
        ],
      },
      {
        kind: 'collisionRiskMap',
        overallScore: 0.62,
        maxRegionScore: 0.74,
        regions: [
          {
            regionId: 'chest',
            measurementKey: 'chestCm',
            score: 0.74,
            fitState: 'snug',
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
          {
            regionId: 'waist',
            measurementKey: 'waistCm',
            score: 0.5,
            fitState: 'regular',
            easeCm: 6,
            requiredStretchRatio: 0.01,
            isLimiting: true,
          },
        ],
      },
      {
        kind: 'confidenceMap',
        overallScore: 0.65,
        maxRegionScore: 0.7,
        regions: [
          {
            regionId: 'chest',
            measurementKey: 'chestCm',
            score: 0.6,
            fitState: 'snug',
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
          {
            regionId: 'waist',
            measurementKey: 'waistCm',
            score: 0.7,
            fitState: 'regular',
            easeCm: 6,
            requiredStretchRatio: 0.01,
            isLimiting: true,
          },
        ],
      },
    ],
    warnings: ['Baseline Phase D worker emits fit_map_json plus preview_png; draped_glb remains pending.'],
  });

  assert.equal(parsed.overlays.length, 4);
  assert.equal(parsed.overlays[2]?.kind, 'collisionRiskMap');
});

test('authoring summary schemas accept committed garment, hair, and accessory artifacts', () => {
  const garment = garmentAuthoringSummarySchema.parse(
    readJsonFixture('../../../authoring/garments/exports/raw/mpfb-female-top_soft_casual.summary.json'),
  );
  const hair = hairAuthoringSummarySchema.parse(
    readJsonFixture('../../../authoring/garments/exports/raw/mpfb-female-hair_signature_ponytail.summary.json'),
  );
  const accessory = accessoryAuthoringSummarySchema.parse(
    readJsonFixture('../../../authoring/garments/exports/raw/mpfb-female-accessory_city_bucket_hat.summary.json'),
  );

  assert.equal(garment.schemaVersion, assetAuthoringSummarySchemaVersion);
  assert.equal(garment.kind, 'garment');
  assert.equal(garment.variantId, 'female-base');
  assert.equal(garment.patternSpec?.relativePath, 'authoring/garments/mpfb/specs/top_soft_casual.pattern-spec.json');
  assert.equal(hair.schemaVersion, assetAuthoringSummarySchemaVersion);
  assert.equal(hair.kind, 'hair');
  assert.equal(accessory.schemaVersion, assetAuthoringSummarySchemaVersion);
  assert.equal(accessory.kind, 'accessory');

  assert.deepEqual(runtimeAssetAuthoringSummarySchema.parse(garment), garment);
  assert.deepEqual(runtimeAssetAuthoringSummarySchema.parse(hair), hair);
  assert.deepEqual(runtimeAssetAuthoringSummarySchema.parse(accessory), accessory);
});

test('garmentPatternSpecSchema accepts committed starter authoring specs', () => {
  const top = garmentPatternSpecSchema.parse(
    readJsonFixture('../../../authoring/garments/mpfb/specs/top_soft_casual.pattern-spec.json'),
  );
  const trousers = garmentPatternSpecSchema.parse(
    readJsonFixture('../../../authoring/garments/mpfb/specs/bottom_soft_wool.pattern-spec.json'),
  );
  const runner = garmentPatternSpecSchema.parse(
    readJsonFixture('../../../authoring/garments/mpfb/specs/shoes_night_runner.pattern-spec.json'),
  );

  assert.equal(top.schemaVersion, garmentPatternSpecSchemaVersion);
  assert.equal(top.runtimeStarterId, 'starter-top-soft-casual');
  assert.equal(top.materialPreset.fabricFamily, 'knit');
  assert.equal(trousers.category, 'bottoms');
  assert.equal(trousers.selectedSizeLabel, 'L');
  assert.equal(runner.category, 'shoes');
  assert.ok(runner.anchorIds.includes('leftFoot'));
});

test('authoring summary schemas reject checkout-specific absolute paths', () => {
  assert.throws(
    () =>
      garmentAuthoringSummarySchema.parse({
        schemaVersion: assetAuthoringSummarySchemaVersion,
        authoringSource: 'mpfb2',
        kind: 'garment',
        variantId: 'female-base',
        garment: {
          name: 'FS.Garment',
          vertexCount: 12,
          materialSlots: ['FS_Material'],
          vertexGroups: ['spine_01'],
        },
        fitAudit: {
          minDistanceMeters: 0.002,
          penetratingVertexCount: 0,
          thresholdCounts: {
            '0.003': 4,
          },
          hotSpots: [],
        },
        armature: {
          name: 'mpfb-female-base',
          boneNames: ['Root'],
        },
        preset: {
          presetId: 'female-base',
          relativePath: '/Users/sol/Desktop/fsp/authoring/avatar/mpfb/presets/female-base.json',
        },
        clothesAsset: {
          kind: 'repo-relative',
          value: 'authoring/garments/.cache/example.mhclo',
        },
        packState: {
          installed: true,
          modern: true,
          installedNow: false,
          userDataSource: 'blender-extension-user-data',
        },
        outputBlend: 'authoring/garments/exports/raw/example.blend',
        outputGlb: 'apps/web/public/assets/garments/example.glb',
      }),
    /repo-relative path/,
  );
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

test('garment fit schemas accept canonical physical-fit payloads', () => {
  const state = garmentFitStateSchema.parse('regular');
  const assessment = garmentFitAssessmentSchema.parse({
    sizeLabel: 'L',
    overallState: state,
    tensionRisk: 'low',
    clippingRisk: 'medium',
    stretchLoad: 0.42,
    limitingKeys: ['chestCm', 'waistCm'],
    dimensions: [
      {
        key: 'chestCm',
        measurementMode: 'flat-half-circumference',
        garmentCm: 108,
        bodyCm: 92,
        effectiveGarmentCm: 111.2,
        easeCm: 19.2,
        requiredStretchRatio: 0,
        state: 'relaxed',
      },
      {
        key: 'waistCm',
        measurementMode: 'body-circumference',
        garmentCm: 84,
        bodyCm: 76,
        effectiveGarmentCm: 85.5,
        easeCm: 9.5,
        requiredStretchRatio: 0,
        state: 'regular',
      },
    ],
  });

  assert.equal(assessment.overallState, 'regular');
  assert.deepEqual(assessment.limitingKeys, ['chestCm', 'waistCm']);
  assert.equal(assessment.dimensions[0]?.measurementMode, 'flat-half-circumference');
});

test('garment fit assessment schema rejects limiting keys that are missing from dimensions', () => {
  assert.throws(() =>
    garmentFitAssessmentSchema.parse({
      sizeLabel: null,
      overallState: 'snug',
      tensionRisk: 'medium',
      clippingRisk: 'medium',
      stretchLoad: 0.78,
      limitingKeys: ['hipCm'],
      dimensions: [
        {
          key: 'waistCm',
          measurementMode: 'body-circumference',
          garmentCm: 80,
          bodyCm: 76,
          effectiveGarmentCm: 82,
          easeCm: 6,
          requiredStretchRatio: 0,
          state: 'regular',
        },
      ],
    }),
  /limitingKeys entries must exist in dimensions/);
});

test('garment instant-fit report schema accepts canonical derived payloads', () => {
  const overallFit = garmentFitOverallSchema.parse('good');
  const report = garmentInstantFitReportSchema.parse({
    schemaVersion: 'garment-instant-fit-report.v1',
    sizeLabel: 'L',
    overallFit,
    overallState: 'relaxed',
    tensionRisk: 'low',
    clippingRisk: 'low',
    confidence: 0.81,
    primaryRegionId: 'chest',
    summary: {
      ko: 'L · 가슴 기준 잘 맞음',
      en: 'L · Chest good fit',
    },
    explanations: [
      {
        ko: '가슴 기준 여유는 10.2cm이며 현재 여유 있게 맞음 상태다.',
        en: 'Chest leads with 10.2cm ease and currently reads relaxed.',
      },
      {
        ko: '현재 선택된 사이즈 기준으로 장력과 클리핑 위험은 낮다.',
        en: 'Tension and clipping risk stay low for the currently selected size.',
      },
    ],
    limitingKeys: ['chestCm'],
    regions: [
      {
        regionId: 'chest',
        measurementKey: 'chestCm',
        fitState: 'relaxed',
        easeCm: 10.2,
        isLimiting: true,
      },
      {
        regionId: 'waist',
        measurementKey: 'waistCm',
        fitState: 'regular',
        easeCm: 7.1,
        isLimiting: false,
      },
    ],
  });

  assert.equal(report.overallFit, 'good');
  assert.equal(report.primaryRegionId, 'chest');
});

test('garment measurement schema accepts accessory-facing keys', () => {
  const measurements = garmentMeasurementsSchema.parse({
    headCircumferenceCm: 57,
    frameWidthCm: 14.5,
  });

  assert.equal(measurements.headCircumferenceCm, 57);
  assert.equal(measurements.frameWidthCm, 14.5);
});

test('runtime garment binding schema accepts hair category with head measurement metadata', () => {
  const parsed = runtimeGarmentAssetSchema.parse({
    id: 'test-hair',
    name: 'Test Hair',
    imageSrc: '/garments/test-hair.png',
    category: 'hair',
    source: 'inventory',
    palette: ['#3c2d27'],
    metadata: {
      measurements: {
        headCircumferenceCm: 56.8,
      },
      measurementModes: {
        headCircumferenceCm: 'body-circumference',
      },
      fitProfile: {
        layer: 'base',
        silhouette: 'regular',
      },
    },
    runtime: {
      modelPath: '/assets/garments/test-hair.glb',
      skeletonProfileId: 'freestyle-rig-v2',
      anchorBindings: [
        { id: 'headCenter', weight: 0.5 },
        { id: 'foreheadCenter', weight: 0.25 },
        { id: 'leftTemple', weight: 0.125 },
        { id: 'rightTemple', weight: 0.125 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: {
        profileId: 'hair-long',
        stiffness: 5.8,
        damping: 0.82,
        influence: 1.2,
        maxYawDeg: 8,
        maxPitchDeg: 6,
        maxRollDeg: 5,
        idleAmplitudeDeg: 1.1,
        idleFrequencyHz: 0.9,
        verticalBobCm: 0.2,
        lateralSwingCm: 0.5,
      },
      surfaceClearanceCm: 0.12,
      renderPriority: 2,
    },
  });

  assert.equal(parsed.category, 'hair');
  assert.equal(parsed.metadata?.measurements?.headCircumferenceCm, 56.8);
  assert.equal(parsed.runtime.secondaryMotion?.profileId, 'hair-long');
});

test('published runtime garment response schemas accept canonical envelopes and reject total drift', () => {
  const garment = publishedGarmentAssetSchema.parse({
    id: 'published-top-precision-tee',
    name: 'Precision Tee',
    imageSrc: '/assets/demo/precision-tee.png',
    category: 'tops',
    source: 'inventory',
    palette: ['#f5f5f5', '#10161f'],
    runtime: {
      modelPath: '/assets/garments/partner/precision-tee.glb',
      skeletonProfileId: 'freestyle-rig-v2',
      anchorBindings: [
        { id: 'leftShoulder', weight: 0.3 },
        { id: 'rightShoulder', weight: 0.3 },
        { id: 'chestCenter', weight: 0.2 },
        { id: 'waistCenter', weight: 0.2 },
      ],
      collisionZones: ['torso', 'arms'],
      bodyMaskZones: [],
      surfaceClearanceCm: 1.2,
      renderPriority: 1,
    },
    publication: {
      sourceSystem: 'admin-domain',
      publishedAt: '2026-04-14T12:00:00.000Z',
      assetVersion: 'precision-tee@1.0.0',
      measurementStandard: 'body-garment-v1',
    },
  });

  const itemResponse = publishedRuntimeGarmentItemResponseSchema.parse({
    item: garment,
  });
  const listResponse = publishedRuntimeGarmentListResponseSchema.parse({
    items: [garment],
    total: 1,
  });
  const closetListResponse = closetRuntimeGarmentListResponseSchema.parse({
    items: [
      {
        item: garment,
        instantFit: null,
      },
    ],
    total: 1,
  });

  assert.equal(itemResponse.item.id, garment.id);
  assert.equal(listResponse.total, 1);
  assert.equal(closetListResponse.items[0]?.item.id, garment.id);
  assert.throws(
    () =>
      publishedRuntimeGarmentListResponseSchema.parse({
        items: [garment],
        total: 2,
      }),
    /total must match items.length/,
  );
  assert.throws(
    () =>
      closetRuntimeGarmentListResponseSchema.parse({
        items: [
          {
            item: garment,
            instantFit: null,
          },
        ],
        total: 2,
      }),
    /total must match items.length/,
  );
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

test('asset metadata schema accepts physical-fit size chart extensions', () => {
  const parsed = assetMetadataSchema.parse({
    measurements: {
      shoulderCm: 52.5,
      chestCm: 58.5,
      sleeveLengthCm: 21,
      lengthCm: 65.5,
    },
    measurementModes: {
      chestCm: 'flat-half-circumference',
      shoulderCm: 'linear-length',
      sleeveLengthCm: 'linear-length',
      lengthCm: 'linear-length',
    },
    sizeChart: [
      {
        label: 'L',
        measurements: {
          shoulderCm: 52.5,
          chestCm: 58.5,
          sleeveLengthCm: 21,
          lengthCm: 65.5,
        },
        measurementModes: {
          chestCm: 'flat-half-circumference',
          shoulderCm: 'linear-length',
        },
        source: 'product-detail',
      },
    ],
    selectedSizeLabel: 'L',
    physicalProfile: {
      materialStretchRatio: 0.1,
      maxComfortStretchRatio: 0.06,
    },
    correctiveFit: {
      compression: {
        widthScale: 0.994,
        depthScale: 0.992,
        clearanceBiasCm: -0.12,
      },
      regular: {
        widthScale: 1,
        depthScale: 1,
        heightScale: 1,
      },
      relaxed: {
        widthScale: 1.014,
        depthScale: 1.01,
        clearanceBiasCm: 0.14,
      },
    },
  });

  assert.equal(parsed.sizeChart?.[0]?.label, 'L');
  assert.equal(parsed.measurementModes?.chestCm, 'flat-half-circumference');
  assert.equal(parsed.physicalProfile?.materialStretchRatio, 0.1);
  assert.equal(parsed.correctiveFit?.compression?.widthScale, 0.994);
  assert.equal(parsed.correctiveFit?.relaxed?.clearanceBiasCm, 0.14);
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

test('runtime garment binding schema accepts pose-aware collision and body-mask tuning', () => {
  const parsed = runtimeGarmentAssetSchema.parse({
    id: 'test-top',
    name: 'Test Top',
    imageSrc: '/garments/test-top.png',
    category: 'tops',
    source: 'inventory',
    palette: ['#ffffff'],
    metadata: {
      measurements: {
        chestCm: 110,
        waistCm: 96,
        sleeveLengthCm: 60,
        lengthCm: 82,
      },
      fitProfile: {
        layer: 'mid',
        silhouette: 'relaxed',
      },
    },
    runtime: {
      modelPath: '/assets/garments/test-top.glb',
      skeletonProfileId: 'freestyle-rig-v2',
      anchorBindings: [
        { id: 'leftShoulder', weight: 0.5 },
        { id: 'rightShoulder', weight: 0.5 },
      ],
      collisionZones: ['torso', 'arms'],
      bodyMaskZones: ['torso'],
      poseTuning: {
        stride: {
          clearanceMultiplier: 1.06,
          widthScale: 1.01,
          extraBodyMaskZones: ['hips'],
        },
        tailored: {
          clearanceMultiplier: 1.08,
          depthScale: 1.02,
          extraBodyMaskZones: ['arms'],
        },
      },
      surfaceClearanceCm: 1.4,
      renderPriority: 2,
    },
  });

  assert.equal(parsed.runtime.poseTuning?.stride?.clearanceMultiplier, 1.06);
  assert.deepEqual(parsed.runtime.poseTuning?.tailored?.extraBodyMaskZones, ['arms']);
});

test('canvas composition schema accepts canonical snapshots', () => {
  const parsed = canvasCompositionSchema.parse({
    version: 1,
    id: 'composition-1',
    title: 'Studio composition',
    stageColor: '#eef1f4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bodyProfile: {
      version: 2,
      gender: 'female',
      bodyFrame: 'balanced',
      simple: {
        heightCm: 171,
        shoulderCm: 43,
        chestCm: 94,
        waistCm: 76,
        hipCm: 99,
        inseamCm: 80,
      },
    },
    closetState: {
      version: 1,
      avatarVariantId: 'female-base',
      poseId: 'neutral',
      activeCategory: 'tops',
      selectedItemId: 'starter-top-ivory-tee',
      equippedItemIds: {
        tops: 'starter-top-ivory-tee',
      },
      qualityTier: 'balanced',
    },
    items: [
      {
        id: 'canvas-item-1',
        assetId: 'starter-top-ivory-tee',
        kind: 'garment',
        x: 120,
        y: 110,
        scale: 1,
        rotation: 0,
        zIndex: 0,
      },
    ],
  });

  assert.equal(parsed.closetState.poseId, 'neutral');
  assert.equal(parsed.items[0]?.assetId, 'starter-top-ivory-tee');
});

test('canvas composition schema normalizes legacy flat body-profile snapshots', () => {
  const parsed = canvasCompositionSchema.parse({
    version: 1,
    id: 'composition-legacy',
    title: 'Legacy composition',
    stageColor: '#eef1f4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bodyProfile: {
      heightCm: 171,
      shoulderCm: 43,
      chestCm: 94,
      waistCm: 76,
      hipCm: 99,
      inseamCm: 80,
      neckCm: 36,
    },
    closetState: {
      version: 1,
      avatarVariantId: 'female-base',
      poseId: 'neutral',
      activeCategory: 'tops',
      selectedItemId: 'starter-top-ivory-tee',
      equippedItemIds: {
        tops: 'starter-top-ivory-tee',
      },
      qualityTier: 'balanced',
    },
    items: [],
  });

  assert.equal(parsed.bodyProfile.version, 2);
  assert.equal(parsed.bodyProfile.simple.heightCm, 171);
  assert.equal(parsed.bodyProfile.detailed?.neckCm, 36);
});

test('closet scene state schema rejects invalid quality tiers', () => {
  assert.throws(() =>
    closetSceneStateSchema.parse({
      version: 1,
      avatarVariantId: 'female-base',
      poseId: 'neutral',
      activeCategory: 'tops',
      selectedItemId: 'starter-top-ivory-tee',
      equippedItemIds: {
        tops: 'starter-top-ivory-tee',
      },
      qualityTier: 'ultra',
    }),
  );
});

test('canvas look input schema accepts canonical canvas composition payloads', () => {
  const parsed = canvasLookInputSchema.parse({
    title: 'Studio composition',
    previewImage: 'data:image/png;base64,abc123',
    data: {
      version: 1,
      id: 'composition-1',
      title: 'Studio composition',
      stageColor: '#eef1f4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bodyProfile: {
        version: 2,
        simple: {
          heightCm: 171,
          shoulderCm: 43,
          chestCm: 94,
          waistCm: 76,
          hipCm: 99,
          inseamCm: 80,
        },
      },
      closetState: {
        version: 1,
        avatarVariantId: 'female-base',
        poseId: 'neutral',
        activeCategory: 'tops',
        selectedItemId: 'starter-top-ivory-tee',
        equippedItemIds: {
          tops: 'starter-top-ivory-tee',
        },
        qualityTier: 'balanced',
      },
      items: [],
    },
  });

  assert.equal(parsed.data.version, 1);
});

test('canvas look data schema rejects unrecognized generic blobs', () => {
  assert.throws(() =>
    canvasLookDataSchema.parse({
      unexpected: 'shape',
    }),
  );
});

test('canvas look input schema rejects title drift between envelope and composition', () => {
  assert.throws(() =>
    canvasLookInputSchema.parse({
      title: 'Mismatched title',
      previewImage: 'data:image/png;base64,abc123',
      data: {
        version: 1,
        id: 'composition-1',
        title: 'Studio composition',
        stageColor: '#eef1f4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bodyProfile: {
          version: 2,
          simple: {
            heightCm: 171,
            shoulderCm: 43,
            chestCm: 94,
            waistCm: 76,
            hipCm: 99,
            inseamCm: 80,
          },
        },
        closetState: {
          version: 1,
          avatarVariantId: 'female-base',
          poseId: 'neutral',
          activeCategory: 'tops',
          selectedItemId: 'starter-top-ivory-tee',
          equippedItemIds: {
            tops: 'starter-top-ivory-tee',
          },
          qualityTier: 'balanced',
        },
        items: [],
      },
    }),
  );
});

test('canvas look response schemas accept implemented envelope shapes', () => {
  const createResponse = canvasLookCreateResponseSchema.parse({
    id: 'look-1',
    shareSlug: 'share-1',
  });
  const listResponse = canvasLookListResponseSchema.parse({
    looks: [
      {
        id: 'look-1',
        shareSlug: 'share-1',
        title: 'Studio composition',
        previewImage: 'data:image/png;base64,abc123',
        createdAt: new Date().toISOString(),
      },
    ],
  });
  const lookRecord = canvasLookRecordSchema.parse({
    id: 'look-1',
    shareSlug: 'share-1',
    title: 'Studio composition',
    description: null,
    previewImage: 'data:image/png;base64,abc123',
    data: {
      version: 1,
      id: 'composition-1',
      title: 'Studio composition',
      stageColor: '#eef1f4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bodyProfile: {
        version: 2,
        simple: {
          heightCm: 171,
          shoulderCm: 43,
          chestCm: 94,
          waistCm: 76,
          hipCm: 99,
          inseamCm: 80,
        },
      },
      closetState: {
        version: 1,
        avatarVariantId: 'female-base',
        poseId: 'neutral',
        activeCategory: 'tops',
        selectedItemId: 'starter-top-ivory-tee',
        equippedItemIds: {
          tops: 'starter-top-ivory-tee',
        },
        qualityTier: 'balanced',
      },
      items: [],
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const getResponse = canvasLookGetResponseSchema.parse({
    look: lookRecord,
  });
  const deleteResponse = canvasLookDeleteResponseSchema.parse({
    status: 'deleted',
  });

  assert.equal(createResponse.id, 'look-1');
  assert.equal(listResponse.looks[0]?.shareSlug, 'share-1');
  assert.equal(getResponse.look.id, 'look-1');
  assert.equal(deleteResponse.status, 'deleted');
});

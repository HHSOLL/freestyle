import assert from 'node:assert/strict';
import test from 'node:test';
import {
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
  legacyBodyProfileFlatSchema,
  bodyProfileUpsertInputSchema,
  garmentFitProfileSchema,
  garmentMeasurementsSchema,
  normalizeBodyProfile,
  runtimeGarmentAssetSchema,
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

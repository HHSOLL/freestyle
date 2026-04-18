import test from "node:test";
import assert from "node:assert/strict";
import {
  avatarParamsToRigTargets,
  avatarStorageKeys,
  bodyProfileToAvatarMorphPlan,
  bodyProfileToAvatarParams,
  createLocalClosetSceneRepository,
  defaultClosetSceneState,
} from "./index.js";
import { normalizeBodyProfile } from "@freestyle/contracts";

test("body profile mapping produces stable normalized avatar params", () => {
  const profile = normalizeBodyProfile({
    gender: "female",
    simple: {
      heightCm: 176,
      shoulderCm: 45,
      chestCm: 99,
      waistCm: 76,
      hipCm: 104,
      inseamCm: 83,
    },
    detailed: {
      armLengthCm: 62,
      torsoLengthCm: 64,
      thighCm: 59,
      calfCm: 38,
    },
  });

  const params = bodyProfileToAvatarParams(profile, "female-base");
  assert.ok(params.stature > 0.5);
  assert.ok(params.shoulderWidth > 0.5);
  assert.ok(params.armLength > 0.5);

  const targets = avatarParamsToRigTargets(params);
  assert.ok(targets.statureScale > 1);
  assert.ok(targets.legLengthScale > 1);
});

test("body profile mapping emits a formal morph plan for mpfb-driven variants", () => {
  const femaleProfile = normalizeBodyProfile({
    gender: "female",
    bodyFrame: "curvy",
    simple: {
      heightCm: 172,
      shoulderCm: 41,
      chestCm: 102,
      waistCm: 74,
      hipCm: 108,
      inseamCm: 81,
    },
    detailed: {
      armLengthCm: 60,
      torsoLengthCm: 63,
      thighCm: 61,
      calfCm: 39,
    },
  });

  const femalePlan = bodyProfileToAvatarMorphPlan(femaleProfile, "female-base");
  assert.equal(femalePlan.variantId, "female-base");
  assert.ok(femalePlan.targetWeights["$md-$fe-$yn-$av$mu-$av$wg-max$hg"] > 0);
  assert.ok(femalePlan.targetWeights["$md-$fe-$yn-$av$mu-$av$wg-maxcup-$av$fi"] > 0);
  assert.ok(femalePlan.rigTargets.legLengthScale > 1);

  const maleProfile = normalizeBodyProfile({
    gender: "male",
    bodyFrame: "athletic",
    simple: {
      heightCm: 184,
      shoulderCm: 50,
      chestCm: 108,
      waistCm: 82,
      hipCm: 101,
      inseamCm: 87,
    },
    detailed: {
      armLengthCm: 64,
      torsoLengthCm: 66,
      thighCm: 60,
      calfCm: 40,
    },
  });

  const malePlan = bodyProfileToAvatarMorphPlan(maleProfile, "male-base");
  assert.equal(malePlan.variantId, "male-base");
  assert.ok(malePlan.targetWeights["$md-universal-$ma-$yn-max$mu-$av$wg"] > 0);
  assert.ok(malePlan.targetWeights["$md-$ma-$yn-$av$mu-$av$wg-max$hg"] > 0);
});

test("female mpfb morph calibration separates lean and curvy bodies", () => {
  const leanProfile = normalizeBodyProfile({
    gender: "female",
    bodyFrame: "athletic",
    simple: {
      heightCm: 170,
      shoulderCm: 43,
      chestCm: 84,
      waistCm: 63,
      hipCm: 91,
      inseamCm: 82,
    },
    detailed: {
      armLengthCm: 61,
      torsoLengthCm: 60,
      thighCm: 50,
      calfCm: 33,
    },
  });
  const curvyProfile = normalizeBodyProfile({
    gender: "female",
    bodyFrame: "curvy",
    simple: {
      heightCm: 170,
      shoulderCm: 40,
      chestCm: 104,
      waistCm: 74,
      hipCm: 111,
      inseamCm: 80,
    },
    detailed: {
      armLengthCm: 58,
      torsoLengthCm: 63,
      thighCm: 63,
      calfCm: 40,
    },
  });

  const leanPlan = bodyProfileToAvatarMorphPlan(leanProfile, "female-base");
  const curvyPlan = bodyProfileToAvatarMorphPlan(curvyProfile, "female-base");

  assert.ok(
    (leanPlan.targetWeights["$md-universal-$fe-$yn-$av$mu-min$wg"] ?? 0) >
      (curvyPlan.targetWeights["$md-universal-$fe-$yn-$av$mu-min$wg"] ?? 0),
  );
  assert.ok(
    (curvyPlan.targetWeights["$md-$fe-$yn-$av$mu-$av$wg-maxcup-max$fi"] ?? 0) >
      (leanPlan.targetWeights["$md-$fe-$yn-$av$mu-$av$wg-maxcup-max$fi"] ?? 0),
  );
});

test("male mpfb morph calibration rewards athletic proportions", () => {
  const softProfile = normalizeBodyProfile({
    gender: "male",
    bodyFrame: "soft",
    simple: {
      heightCm: 176,
      shoulderCm: 43,
      chestCm: 96,
      waistCm: 90,
      hipCm: 100,
      inseamCm: 81,
    },
    detailed: {
      armLengthCm: 59,
      torsoLengthCm: 65,
      thighCm: 57,
      calfCm: 37,
    },
  });
  const athleticProfile = normalizeBodyProfile({
    gender: "male",
    bodyFrame: "athletic",
    simple: {
      heightCm: 184,
      shoulderCm: 51,
      chestCm: 109,
      waistCm: 80,
      hipCm: 101,
      inseamCm: 88,
    },
    detailed: {
      armLengthCm: 65,
      torsoLengthCm: 63,
      thighCm: 61,
      calfCm: 40,
    },
  });

  const softPlan = bodyProfileToAvatarMorphPlan(softProfile, "male-base");
  const athleticPlan = bodyProfileToAvatarMorphPlan(athleticProfile, "male-base");

  assert.ok(
    (athleticPlan.targetWeights["$md-universal-$ma-$yn-max$mu-$av$wg"] ?? 0) >
      (softPlan.targetWeights["$md-universal-$ma-$yn-max$mu-$av$wg"] ?? 0),
  );
  assert.ok(
    (athleticPlan.targetWeights["$md-$ma-$yn-max$mu-$av$wg-$id$pr"] ?? 0) >
      (softPlan.targetWeights["$md-$ma-$yn-max$mu-$av$wg-$id$pr"] ?? 0),
  );
});

test("default closet scene baseline uses the dressed review pose and high quality tier", () => {
  assert.equal(defaultClosetSceneState.version, 7);
  assert.equal(defaultClosetSceneState.poseId, "relaxed");
  assert.equal(defaultClosetSceneState.qualityTier, "high");
});

test("closet scene repository resets stale v3 scene snapshots", () => {
  const previousWindow = globalThis.window;
  const storage = new Map<string, string>();
  storage.set(
    avatarStorageKeys.closetScene,
    JSON.stringify({
      version: 3,
      avatarVariantId: "female-base",
      poseId: "relaxed",
      activeCategory: "tops",
      selectedItemId: "starter-top-soft-casual",
      equippedItemIds: { tops: "starter-top-soft-casual" },
      qualityTier: "balanced",
    }),
  );

  globalThis.window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
  } as unknown as Window & typeof globalThis;

  try {
    const repository = createLocalClosetSceneRepository();
    assert.deepEqual(repository.load(), defaultClosetSceneState);
  } finally {
    if (previousWindow) {
      globalThis.window = previousWindow;
    } else {
      // @ts-expect-error test cleanup removes the temporary browser shim
      delete globalThis.window;
    }
  }
});

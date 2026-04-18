import {
  clamp,
  readStoredJson,
  roundTo,
  writeStoredJson,
} from "@freestyle/shared-utils";
import type {
  AvatarMorphPlan,
  AvatarNormalizedParams,
  AvatarPoseId,
  AvatarRigTargets,
  AvatarRenderVariantId,
  ClosetSceneState,
} from "@freestyle/shared-types";
import {
  defaultBodyProfile,
  flattenBodyProfile,
  normalizeBodyProfile,
  setDetailedBodyMeasurement,
  setSimpleBodyMeasurement,
  type BodyProfile,
  type BodyProfileDetailedKey,
  type BodyProfileSimpleKey,
} from "@freestyle/contracts";

export const avatarStorageKeys = {
  bodyProfile: "freestyle:avatar-profile:v2",
  closetScene: "freestyle:closet-scene:v7",
} as const;

export const bodyMeasurementFields: Array<{
  key: BodyProfileSimpleKey | BodyProfileDetailedKey;
  label: { ko: string; en: string };
  min: number;
  max: number;
  group: "core" | "detail";
}> = [
  { key: "heightCm", label: { ko: "키", en: "Height" }, min: 148, max: 198, group: "core" },
  { key: "shoulderCm", label: { ko: "어깨", en: "Shoulder" }, min: 34, max: 56, group: "core" },
  { key: "chestCm", label: { ko: "가슴", en: "Chest" }, min: 74, max: 132, group: "core" },
  { key: "waistCm", label: { ko: "허리", en: "Waist" }, min: 56, max: 120, group: "core" },
  { key: "hipCm", label: { ko: "힙", en: "Hip" }, min: 78, max: 136, group: "core" },
  { key: "inseamCm", label: { ko: "다리 길이", en: "Inseam" }, min: 68, max: 95, group: "core" },
  { key: "armLengthCm", label: { ko: "팔 길이", en: "Arm length" }, min: 50, max: 72, group: "detail" },
  { key: "torsoLengthCm", label: { ko: "상체 길이", en: "Torso" }, min: 50, max: 74, group: "detail" },
  { key: "thighCm", label: { ko: "허벅지", en: "Thigh" }, min: 42, max: 76, group: "detail" },
  { key: "calfCm", label: { ko: "종아리", en: "Calf" }, min: 28, max: 52, group: "detail" },
];

export const avatarPoseLibrary: Array<{
  id: AvatarPoseId;
  label: { ko: string; en: string };
}> = [
  { id: "neutral", label: { ko: "뉴트럴", en: "Neutral" } },
  { id: "relaxed", label: { ko: "릴랙스", en: "Relaxed" } },
  { id: "contrapposto", label: { ko: "콘트라포스토", en: "Contrapposto" } },
  { id: "stride", label: { ko: "스트라이드", en: "Stride" } },
  { id: "tailored", label: { ko: "테일러드", en: "Tailored" } },
];

export const fitReviewArchetypes = [
  {
    id: "female-petite-lean",
    label: { ko: "Petite Lean", en: "Petite Lean" },
    profile: normalizeBodyProfile({
      gender: "female",
      bodyFrame: "athletic",
      simple: {
        heightCm: 158,
        shoulderCm: 38,
        chestCm: 82,
        waistCm: 61,
        hipCm: 89,
        inseamCm: 74,
      },
      detailed: {
        armLengthCm: 55,
        headCircumferenceCm: 53,
        torsoLengthCm: 58,
        thighCm: 49,
        calfCm: 32,
      },
    }),
  },
  {
    id: "female-balanced",
    label: { ko: "Balanced", en: "Balanced" },
    profile: normalizeBodyProfile({
      gender: "female",
      bodyFrame: "balanced",
      simple: {
        heightCm: 166,
        shoulderCm: 40,
        chestCm: 88,
        waistCm: 70,
        hipCm: 96,
        inseamCm: 79,
      },
      detailed: {
        armLengthCm: 58,
        headCircumferenceCm: 55,
        torsoLengthCm: 60,
        thighCm: 54,
        calfCm: 35,
      },
    }),
  },
  {
    id: "female-curvy",
    label: { ko: "Curvy", en: "Curvy" },
    profile: normalizeBodyProfile({
      gender: "female",
      bodyFrame: "curvy",
      simple: {
        heightCm: 171,
        shoulderCm: 41,
        chestCm: 103,
        waistCm: 75,
        hipCm: 109,
        inseamCm: 81,
      },
      detailed: {
        armLengthCm: 60,
        headCircumferenceCm: 56.5,
        torsoLengthCm: 63,
        thighCm: 62,
        calfCm: 39,
      },
    }),
  },
  {
    id: "male-soft",
    label: { ko: "Soft", en: "Soft" },
    profile: normalizeBodyProfile({
      gender: "male",
      bodyFrame: "soft",
      simple: {
        heightCm: 176,
        shoulderCm: 44,
        chestCm: 96,
        waistCm: 90,
        hipCm: 100,
        inseamCm: 81,
      },
      detailed: {
        armLengthCm: 59,
        headCircumferenceCm: 57,
        torsoLengthCm: 64,
        thighCm: 57,
        calfCm: 37,
      },
    }),
  },
  {
    id: "male-balanced",
    label: { ko: "Balanced", en: "Balanced" },
    profile: normalizeBodyProfile({
      gender: "male",
      bodyFrame: "balanced",
      simple: {
        heightCm: 179,
        shoulderCm: 47,
        chestCm: 100,
        waistCm: 84,
        hipCm: 99,
        inseamCm: 84,
      },
      detailed: {
        armLengthCm: 62,
        headCircumferenceCm: 58,
        torsoLengthCm: 64,
        thighCm: 58,
        calfCm: 38,
      },
    }),
  },
  {
    id: "male-athletic-tall",
    label: { ko: "Athletic Tall", en: "Athletic Tall" },
    profile: normalizeBodyProfile({
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
        headCircumferenceCm: 59,
        torsoLengthCm: 63,
        thighCm: 61,
        calfCm: 40,
      },
    }),
  },
] as const;

export const defaultClosetSceneState: ClosetSceneState = {
  version: 7,
  avatarVariantId: "female-base",
  poseId: "relaxed",
  activeCategory: "tops",
  selectedItemId: null,
  equippedItemIds: {},
  qualityTier: "high",
};

const baseMeasurementsByVariant: Record<AvatarRenderVariantId, Record<string, number>> = {
  "female-base": {
    heightCm: 166,
    shoulderCm: 40,
    chestCm: 88,
    waistCm: 70,
    hipCm: 96,
    inseamCm: 79,
    armLengthCm: 58,
    torsoLengthCm: 60,
    thighCm: 54,
    calfCm: 35,
  },
  "male-base": {
    heightCm: 179,
    shoulderCm: 47,
    chestCm: 100,
    waistCm: 84,
    hipCm: 99,
    inseamCm: 84,
    armLengthCm: 62,
    torsoLengthCm: 64,
    thighCm: 58,
    calfCm: 38,
  },
};

export const resolveAvatarVariantFromProfile = (profile: BodyProfile): AvatarRenderVariantId =>
  profile.gender === "male" ? "male-base" : "female-base";

const normalizeRelative = (value: number, base: number, min = 0.75, max = 1.25) =>
  clamp((value / base - min) / (max - min), 0, 1);

export const bodyProfileToAvatarParams = (
  profile: BodyProfile,
  variantId: AvatarRenderVariantId = resolveAvatarVariantFromProfile(profile),
): AvatarNormalizedParams => {
  const flat = flattenBodyProfile(profile);
  const base = baseMeasurementsByVariant[variantId];
  return {
    stature: normalizeRelative(flat.heightCm, base.heightCm, 0.88, 1.12),
    shoulderWidth: normalizeRelative(flat.shoulderCm, base.shoulderCm, 0.82, 1.18),
    chestVolume: normalizeRelative(flat.chestCm, base.chestCm, 0.82, 1.2),
    waistVolume: normalizeRelative(flat.waistCm, base.waistCm, 0.78, 1.2),
    hipVolume: normalizeRelative(flat.hipCm, base.hipCm, 0.82, 1.2),
    armLength: normalizeRelative(flat.armLengthCm ?? base.armLengthCm, base.armLengthCm, 0.86, 1.14),
    inseam: normalizeRelative(flat.inseamCm, base.inseamCm, 0.86, 1.16),
    torsoLength: normalizeRelative(flat.torsoLengthCm ?? base.torsoLengthCm, base.torsoLengthCm, 0.88, 1.14),
    legVolume: normalizeRelative((flat.thighCm ?? base.thighCm) + (flat.calfCm ?? base.calfCm), base.thighCm + base.calfCm, 0.8, 1.2),
  };
};

export const avatarParamsToRigTargets = (params: AvatarNormalizedParams): AvatarRigTargets => ({
  statureScale: roundTo(0.92 + params.stature * 0.2, 4),
  shoulderOffset: roundTo(-0.12 + params.shoulderWidth * 0.24, 4),
  chestScale: roundTo(0.88 + params.chestVolume * 0.24, 4),
  waistScale: roundTo(0.86 + params.waistVolume * 0.24, 4),
  hipScale: roundTo(0.86 + params.hipVolume * 0.24, 4),
  armLengthScale: roundTo(0.9 + params.armLength * 0.18, 4),
  legLengthScale: roundTo(0.9 + params.inseam * 0.22, 4),
  torsoScale: roundTo(0.9 + params.torsoLength * 0.18, 4),
  legVolumeScale: roundTo(0.88 + params.legVolume * 0.22, 4),
});

const clamp01 = (value: number) => clamp(value, 0, 1);

const average = (...values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const frameBoost = (profile: BodyProfile, frame: "athletic" | "soft" | "curvy") => (profile.bodyFrame === frame ? 1 : 0);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  if (edge0 === edge1) {
    return value >= edge1 ? 1 : 0;
  }
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

const aboveCenter = (value: number, center = 0.5) => smoothstep(center, 1, value);
const belowCenter = (value: number, center = 0.5) => smoothstep(0, center, center - value);

const deriveAvatarShapeSignals = (params: AvatarNormalizedParams, profile: BodyProfile) => {
  const athletic = frameBoost(profile, "athletic");
  const soft = frameBoost(profile, "soft");
  const curvy = frameBoost(profile, "curvy");

  const chestHigh = aboveCenter(params.chestVolume);
  const waistHigh = aboveCenter(params.waistVolume);
  const hipHigh = aboveCenter(params.hipVolume);
  const legHigh = aboveCenter(params.legVolume);
  const shoulderHigh = aboveCenter(params.shoulderWidth);
  const armHigh = aboveCenter(params.armLength);
  const inseamHigh = aboveCenter(params.inseam);

  const chestLow = belowCenter(params.chestVolume);
  const waistLow = belowCenter(params.waistVolume);
  const hipLow = belowCenter(params.hipVolume);
  const legLow = belowCenter(params.legVolume);
  const shoulderLow = belowCenter(params.shoulderWidth);
  const armLow = belowCenter(params.armLength);
  const torsoLow = belowCenter(params.torsoLength);

  const bodyMass = clamp01(average(params.chestVolume, params.waistVolume, params.hipVolume, params.legVolume));
  const leanSignal = clamp01(average(chestLow, waistLow, hipLow, legLow));
  const weightSignal = clamp01(average(chestHigh, waistHigh, hipHigh, legHigh));
  const muscleSignal = clamp01(average(shoulderHigh, chestHigh, armHigh) * 0.82 + athletic * 0.18 - soft * 0.06);
  const softSignal = clamp01(average(waistHigh, hipHigh, shoulderLow, armLow) * 0.78 + soft * 0.22);
  const curveSignal = clamp01(average(chestHigh, hipHigh, waistLow) * 0.9 + curvy * 0.18);
  const tallSignal = aboveCenter(params.stature, 0.48);
  const longLegSignal = clamp01(average(inseamHigh, torsoLow) * 0.76 + aboveCenter(params.stature, 0.54) * 0.24);
  const shoulderWaistBalance = clamp01(0.5 + (params.shoulderWidth - params.waistVolume) * 1.35);
  const proportionSignal = clamp01(average(shoulderWaistBalance, longLegSignal, 1 - Math.abs(params.torsoLength - 0.5) * 1.2));
  const bustProjection = clamp01(average(chestHigh, waistLow, shoulderHigh * 0.35 + hipHigh * 0.65));

  return {
    athletic,
    soft,
    curvy,
    bodyMass,
    leanSignal,
    weightSignal,
    muscleSignal,
    softSignal,
    curveSignal,
    tallSignal,
    longLegSignal,
    proportionSignal,
    bustProjection,
  };
};

export const avatarParamsToMorphTargets = (
  params: AvatarNormalizedParams,
  variantId: AvatarRenderVariantId,
  profile: BodyProfile,
): Record<string, number> => {
  const {
    athletic,
    bodyMass,
    bustProjection,
    curveSignal,
    leanSignal,
    longLegSignal,
    muscleSignal,
    proportionSignal,
    softSignal,
    tallSignal,
    weightSignal,
  } = deriveAvatarShapeSignals(params, profile);

  if (variantId === "female-base") {
    return {
      "$md-universal-$fe-$yn-min$mu-$av$wg": roundTo(clamp01(softSignal * 0.56 + bodyMass * 0.22 + curveSignal * 0.08), 4),
      "$md-universal-$fe-$yn-$av$mu-min$wg": roundTo(clamp01(leanSignal * 0.72 + longLegSignal * 0.12), 4),
      "$md-universal-$fe-$yn-$av$mu-$av$wg": roundTo(clamp01(bodyMass * 0.52 + softSignal * 0.16 + curveSignal * 0.14), 4),
      "$md-$fe-$yn-$av$mu-$av$wg-max$hg": roundTo(clamp01(tallSignal * 0.74 + longLegSignal * 0.18), 4),
      "$md-$fe-$yn-$av$mu-$av$wg-$avcup-max$fi": roundTo(clamp01(bustProjection * 0.42 + curveSignal * 0.16), 4),
      "$md-$fe-$yn-$av$mu-$av$wg-maxcup-$av$fi": roundTo(clamp01(bustProjection * 0.34 + curveSignal * 0.22), 4),
      "$md-$fe-$yn-$av$mu-$av$wg-maxcup-max$fi": roundTo(clamp01(bustProjection * 0.22 + curveSignal * 0.28), 4),
    };
  }

  return {
    "$md-universal-$ma-$yn-$av$mu-$av$wg": roundTo(clamp01(bodyMass * 0.42 + proportionSignal * 0.12), 4),
    "$md-universal-$ma-$yn-$av$mu-max$wg": roundTo(clamp01(weightSignal * 0.76 + softSignal * 0.12), 4),
    "$md-universal-$ma-$yn-max$mu-$av$wg": roundTo(clamp01(muscleSignal * 0.8 + athletic * 0.12), 4),
    "$md-$ma-$yn-$av$mu-$av$wg-max$hg": roundTo(clamp01(tallSignal * 0.72 + longLegSignal * 0.2), 4),
    "$md-$ma-$yn-$av$mu-$av$wg-$id$pr": roundTo(clamp01(proportionSignal * 0.64 + leanSignal * 0.14), 4),
    "$md-$ma-$yn-max$mu-$av$wg-$id$pr": roundTo(clamp01(proportionSignal * 0.52 + muscleSignal * 0.3), 4),
  };
};

export const bodyProfileToAvatarMorphPlan = (
  profile: BodyProfile,
  variantId: AvatarRenderVariantId = resolveAvatarVariantFromProfile(profile),
): AvatarMorphPlan => {
  const params = bodyProfileToAvatarParams(profile, variantId);
  return {
    variantId,
    targetWeights: avatarParamsToMorphTargets(params, variantId, profile),
    rigTargets: avatarParamsToRigTargets(params),
  };
};

export const updateBodyProfileMeasurement = (
  profile: BodyProfile,
  key: BodyProfileSimpleKey | BodyProfileDetailedKey,
  value: number,
) => {
  const simpleKeys = new Set<BodyProfileSimpleKey>([
    "heightCm",
    "shoulderCm",
    "chestCm",
    "waistCm",
    "hipCm",
    "inseamCm",
  ]);

  return simpleKeys.has(key as BodyProfileSimpleKey)
    ? setSimpleBodyMeasurement(profile, key as BodyProfileSimpleKey, value)
    : setDetailedBodyMeasurement(profile, key as BodyProfileDetailedKey, value);
};

export type BodyProfileRepository = {
  load: () => BodyProfile;
  save: (profile: BodyProfile) => void;
};

export type ClosetSceneRepository = {
  load: () => ClosetSceneState;
  save: (state: ClosetSceneState) => void;
};

export const createLocalBodyProfileRepository = (): BodyProfileRepository => ({
  load: () => normalizeBodyProfile(readStoredJson(avatarStorageKeys.bodyProfile, defaultBodyProfile)),
  save: (profile) => writeStoredJson(avatarStorageKeys.bodyProfile, normalizeBodyProfile(profile)),
});

export const createLocalClosetSceneRepository = (): ClosetSceneRepository => ({
  load: () => {
    const stored = readStoredJson<ClosetSceneState>(avatarStorageKeys.closetScene, defaultClosetSceneState);
    if (!stored || stored.version !== defaultClosetSceneState.version) {
      return defaultClosetSceneState;
    }
    return {
      ...defaultClosetSceneState,
      ...stored,
      equippedItemIds: {
        ...defaultClosetSceneState.equippedItemIds,
        ...(stored.equippedItemIds ?? {}),
      },
    };
  },
  save: (state) => writeStoredJson(avatarStorageKeys.closetScene, { ...defaultClosetSceneState, ...state }),
});

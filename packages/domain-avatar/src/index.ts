import {
  clamp,
  readStoredJson,
  roundTo,
  writeStoredJson,
} from "@freestyle/shared-utils";
import type {
  AvatarNormalizedParams,
  AvatarPoseId,
  AvatarRenderVariantId,
  BodyProfile,
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
  ClosetSceneState,
} from "@freestyle/shared-types";
import {
  defaultBodyProfile,
  flattenBodyProfile,
  normalizeBodyProfile,
  setDetailedBodyMeasurement,
  setSimpleBodyMeasurement,
} from "@freestyle/shared-types";

export const avatarStorageKeys = {
  bodyProfile: "freestyle:avatar-profile:v2",
  closetScene: "freestyle:closet-scene:v1",
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

export const defaultClosetSceneState: ClosetSceneState = {
  version: 1,
  avatarVariantId: "female-base",
  poseId: "neutral",
  activeCategory: "tops",
  selectedItemId: null,
  equippedItemIds: {},
  qualityTier: "balanced",
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

export const avatarParamsToRigTargets = (params: AvatarNormalizedParams) => ({
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

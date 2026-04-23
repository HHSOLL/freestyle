import type { GarmentManifest } from "@freestyle/asset-schema";
export * from "./viewer-asset-policy.js";

export const bodyProfileSimpleKeys = [
  "heightCm",
  "shoulderCm",
  "chestCm",
  "waistCm",
  "hipCm",
  "inseamCm",
] as const;

export const bodyProfileDetailedKeys = [
  "armLengthCm",
  "headCircumferenceCm",
  "neckCm",
  "torsoLengthCm",
  "sleeveLengthCm",
  "bicepCm",
  "forearmCm",
  "wristCm",
  "riseCm",
  "outseamCm",
  "thighCm",
  "kneeCm",
  "calfCm",
  "ankleCm",
] as const;

export type AvatarGender = "female" | "male" | "neutral";
export type BodyFrame = "balanced" | "athletic" | "soft" | "curvy";
export type ProductSurfaceId = "closet" | "fitting" | "canvas" | "community" | "profile";
export type QualityTier = "low" | "balanced" | "high";
export type AvatarPoseId = "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
export type AvatarRenderVariantId = "female-base" | "male-base";

export type BodyProfileSimpleKey = (typeof bodyProfileSimpleKeys)[number];
export type BodyProfileDetailedKey = (typeof bodyProfileDetailedKeys)[number];

export type BodyProfileSimple = {
  heightCm: number;
  shoulderCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  inseamCm: number;
};

export type BodyProfileDetailed = {
  armLengthCm?: number;
  headCircumferenceCm?: number;
  neckCm?: number;
  torsoLengthCm?: number;
  sleeveLengthCm?: number;
  bicepCm?: number;
  forearmCm?: number;
  wristCm?: number;
  riseCm?: number;
  outseamCm?: number;
  thighCm?: number;
  kneeCm?: number;
  calfCm?: number;
  ankleCm?: number;
};

export type BodyProfile = {
  version?: 2;
  gender?: AvatarGender;
  bodyFrame?: BodyFrame;
  simple: BodyProfileSimple;
  detailed?: BodyProfileDetailed;
};

export type LegacyBodyProfileFlat = BodyProfileSimple &
  BodyProfileDetailed & {
    gender?: AvatarGender;
    bodyFrame?: BodyFrame;
  };

export type FlattenedBodyProfile = BodyProfileSimple & BodyProfileDetailed;

export const defaultBodyProfileSimple: BodyProfileSimple = Object.freeze({
  heightCm: 170,
  shoulderCm: 42,
  chestCm: 92,
  waistCm: 76,
  hipCm: 96,
  inseamCm: 79,
});

export const defaultBodyProfileDetailed: BodyProfileDetailed = Object.freeze({
  armLengthCm: 59,
  headCircumferenceCm: 55,
  torsoLengthCm: 61,
  thighCm: 55,
  calfCm: 36,
});

export const defaultBodyProfile: BodyProfile = Object.freeze({
  version: 2,
  gender: "female",
  bodyFrame: "balanced",
  simple: { ...defaultBodyProfileSimple },
  detailed: { ...defaultBodyProfileDetailed },
});

export type AvatarNormalizedParams = {
  stature: number;
  shoulderWidth: number;
  chestVolume: number;
  waistVolume: number;
  hipVolume: number;
  armLength: number;
  inseam: number;
  torsoLength: number;
  legVolume: number;
};

export type AvatarRigTargets = {
  statureScale: number;
  shoulderOffset: number;
  chestScale: number;
  waistScale: number;
  hipScale: number;
  armLengthScale: number;
  legLengthScale: number;
  torsoScale: number;
  legVolumeScale: number;
};

export type AvatarMorphPlan = {
  variantId: AvatarRenderVariantId;
  targetWeights: Record<string, number>;
  rigTargets: AvatarRigTargets;
};

export type GarmentMeasurements = {
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  headCircumferenceCm?: number;
  frameWidthCm?: number;
  shoulderCm?: number;
  sleeveLengthCm?: number;
  lengthCm?: number;
  inseamCm?: number;
  riseCm?: number;
  hemCm?: number;
};

export type GarmentMeasurementKey = keyof GarmentMeasurements;

export type GarmentMeasurementMode =
  | "body-circumference"
  | "flat-half-circumference"
  | "linear-length";

export type GarmentMeasurementModeMap = Partial<Record<GarmentMeasurementKey, GarmentMeasurementMode>>;

export type GarmentSizeSpec = {
  label: string;
  measurements: GarmentMeasurements;
  measurementModes?: GarmentMeasurementModeMap;
  source?: "authoring" | "product-detail" | "estimated";
  notes?: string;
};

export type GarmentPhysicalProfile = {
  materialStretchRatio?: number;
  maxComfortStretchRatio?: number;
  compressionToleranceCm?: Partial<Record<GarmentMeasurementKey, number>>;
  easeBiasCm?: Partial<Record<GarmentMeasurementKey, number>>;
};

export type GarmentCorrectiveProfileEntry = {
  widthScale?: number;
  depthScale?: number;
  heightScale?: number;
  clearanceBiasCm?: number;
  offsetY?: number;
};

export type GarmentCorrectiveProfile = Partial<Record<GarmentFitState, GarmentCorrectiveProfileEntry>>;

export type GarmentFitState = "compression" | "snug" | "regular" | "relaxed" | "oversized";

export type GarmentFitDimensionAssessment = {
  key: GarmentMeasurementKey;
  measurementMode: GarmentMeasurementMode;
  garmentCm: number;
  bodyCm: number;
  effectiveGarmentCm: number;
  easeCm: number;
  requiredStretchRatio: number;
  state: GarmentFitState;
};

export type GarmentFitAssessment = {
  sizeLabel: string | null;
  overallState: GarmentFitState;
  tensionRisk: "low" | "medium" | "high";
  clippingRisk: "low" | "medium" | "high";
  stretchLoad: number;
  limitingKeys: GarmentMeasurementKey[];
  dimensions: GarmentFitDimensionAssessment[];
};

export type GarmentFitProfile = {
  silhouette?: "tailored" | "regular" | "relaxed" | "oversized";
  layer?: "base" | "mid" | "outer";
  structure?: "soft" | "balanced" | "structured";
  stretch?: number;
  drape?: number;
};

export type GarmentCategory = "tops" | "bottoms" | "outerwear" | "shoes" | "accessories" | "hair" | "custom";
export type AssetCategory = GarmentCategory;
export type AssetSource = "inventory" | "upload" | "url" | "import" | "starter" | "lab";

export type GarmentProfile = {
  version: 1;
  category: string;
  image: {
    width: number;
    height: number;
  };
  bbox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  normalizedBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
    centerX: number;
  };
  silhouetteSamples: Array<{
    yRatio: number;
    widthRatio: number;
    centerRatio: number;
  }>;
  coverage: {
    topRatio: number;
    bottomRatio: number;
    lengthRatio: number;
  };
  widthProfile: {
    shoulderRatio: number;
    chestRatio: number;
    waistRatio: number;
    hipRatio: number;
    hemRatio: number;
  };
};

export type AssetMetadata = Partial<{
  sourceTitle: string;
  sourceBrand: string;
  sourceUrl: string;
  originalSize: {
    width: number;
    height: number;
  };
  cutout: {
    removedBackground?: boolean;
    strategy?: "remote_remove_bg" | "embedded_alpha" | "local_heuristic";
    fallbackUsed?: boolean;
    quality?: Record<string, unknown>;
    trimRect?: {
      left: number;
      top: number;
      width: number;
      height: number;
      padding: number;
    };
  };
  measurements: GarmentMeasurements;
  measurementModes: GarmentMeasurementModeMap;
  sizeChart: GarmentSizeSpec[];
  selectedSizeLabel: string;
  physicalProfile: GarmentPhysicalProfile;
  correctiveFit: GarmentCorrectiveProfile;
  fitProfile: GarmentFitProfile;
  garmentProfile: GarmentProfile;
  dominantColor: string;
}>;

export type Asset = {
  id: string;
  name: string;
  imageSrc: string;
  category: AssetCategory;
  price?: number;
  brand?: string;
  source: AssetSource;
  removedBackground?: boolean;
  sourceUrl?: string;
  metadata?: AssetMetadata;
  garmentProfile?: GarmentProfile;
};

export type AvatarAnchorId =
  | "neckBase"
  | "headCenter"
  | "foreheadCenter"
  | "leftTemple"
  | "rightTemple"
  | "leftShoulder"
  | "rightShoulder"
  | "chestCenter"
  | "waistCenter"
  | "hipCenter"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle"
  | "leftFoot"
  | "rightFoot";

export type GarmentAnchorBinding = {
  id: AvatarAnchorId;
  weight: number;
};

export type GarmentCollisionZone = "torso" | "arms" | "hips" | "legs" | "feet";

export type GarmentPoseRuntimeTuningEntry = {
  widthScale?: number;
  depthScale?: number;
  heightScale?: number;
  clearanceMultiplier?: number;
  offsetY?: number;
  extraBodyMaskZones?: GarmentCollisionZone[];
};

export type GarmentPoseRuntimeTuning = Partial<Record<AvatarPoseId, GarmentPoseRuntimeTuningEntry>>;

export type GarmentSecondaryMotionProfileId =
  | "hair-sway"
  | "hair-long"
  | "hair-bob"
  | "garment-soft"
  | "garment-loose";

export type GarmentSecondaryMotionBinding = {
  profileId: GarmentSecondaryMotionProfileId;
  stiffness: number;
  damping: number;
  influence: number;
  maxYawDeg: number;
  maxPitchDeg: number;
  maxRollDeg: number;
  idleAmplitudeDeg?: number;
  idleFrequencyHz?: number;
  verticalBobCm?: number;
  lateralSwingCm?: number;
};

export type GarmentRuntimeLodPaths = {
  lod1?: string;
  lod2?: string;
};

export type GarmentRuntimeBinding = {
  modelPath: string;
  modelPathByVariant?: Partial<Record<AvatarRenderVariantId, string>>;
  lodModelPaths?: GarmentRuntimeLodPaths;
  lodModelPathsByVariant?: Partial<Record<AvatarRenderVariantId, GarmentRuntimeLodPaths>>;
  skeletonProfileId: string;
  anchorBindings: GarmentAnchorBinding[];
  collisionZones: GarmentCollisionZone[];
  bodyMaskZones: GarmentCollisionZone[];
  poseTuning?: GarmentPoseRuntimeTuning;
  secondaryMotion?: GarmentSecondaryMotionBinding;
  surfaceClearanceCm: number;
  renderPriority: number;
};

export type AssetApprovalState =
  | "DRAFT"
  | "TECH_CANDIDATE"
  | "VISUAL_CANDIDATE"
  | "FIT_CANDIDATE"
  | "CERTIFIED"
  | "PUBLISHED"
  | "DEPRECATED"
  | "REJECTED";

export type GarmentPublicationRecord = {
  sourceSystem: "starter-catalog" | "admin-domain" | "api-published";
  publishedAt: string;
  assetVersion: string;
  measurementStandard: "body-garment-v1";
  provenanceUrl?: string;
  approvalState?: AssetApprovalState;
  approvedAt?: string;
  approvedBy?: string;
  certificationNotes?: string[];
  viewerManifestVersion?: string;
};

export type SkeletonProfile = {
  id: string;
  bindPose: "A-pose" | "T-pose";
  upAxis: "Y-up";
  unit: "meter";
  anchors: AvatarAnchorId[];
  collisionZones: GarmentCollisionZone[];
  bodyMaskZones: GarmentCollisionZone[];
  notes?: string;
};

export type RuntimeGarmentAsset = Asset & {
  runtime: GarmentRuntimeBinding;
  palette: string[];
  publication?: GarmentPublicationRecord;
};

export type StarterGarment = RuntimeGarmentAsset & {
  source: "starter";
};

export type PublishedGarmentAsset = RuntimeGarmentAsset & {
  source: "inventory" | "import";
  publication: GarmentPublicationRecord;
  viewerManifest?: GarmentManifest;
};

export type ClosetSceneState = {
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  activeCategory: GarmentCategory;
  selectedItemId: string | null;
  equippedItemIds: Partial<Record<GarmentCategory, string>>;
  qualityTier: QualityTier;
};

export type CanvasItem = {
  id: string;
  assetId: string;
  kind: "garment" | "note";
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type CanvasComposition = {
  version: 1;
  id: string;
  title: string;
  stageColor: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  bodyProfile: BodyProfile;
  closetState: ClosetSceneState;
  items: CanvasItem[];
};

export type SavedLook = {
  id: string;
  title: string;
  previewImage: string;
  createdAt: string;
  surface: ProductSurfaceId;
};

export type PersistedRecord<T> = {
  version: number;
  updatedAt: string;
  value: T;
};

export type BodyProfileRecord = {
  profile: BodyProfile;
  version: 2;
  updatedAt?: string;
};

export type BodyProfileUpsertInput = {
  profile: BodyProfile;
};

export type PrimaryNavigationItem = {
  id: ProductSurfaceId;
  href: string;
  label: {
    ko: string;
    en: string;
  };
};

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickNumericFields = <T extends readonly string[]>(input: Record<string, unknown>, keys: T) => {
  const next: Partial<Record<T[number], number>> = {};
  for (const key of keys) {
    const value = input[key];
    if (isFiniteNumber(value)) {
      next[key as T[number]] = value;
    }
  }
  return next;
};

export const isBodyProfile = (value: unknown): value is BodyProfile => {
  if (!isRecord(value)) return false;
  const simple = value.simple;
  if (!isRecord(simple)) return false;
  return bodyProfileSimpleKeys.every((key) => isFiniteNumber(simple[key]));
};

export const isLegacyBodyProfileFlat = (value: unknown): value is LegacyBodyProfileFlat => {
  if (!isRecord(value)) return false;
  return bodyProfileSimpleKeys.every((key) => isFiniteNumber(value[key]));
};

export const normalizeBodyProfile = (input: unknown): BodyProfile => {
  if (isBodyProfile(input)) {
    return {
      version: 2,
      gender:
        input.gender === "female" || input.gender === "male" || input.gender === "neutral"
          ? input.gender
          : defaultBodyProfile.gender,
      bodyFrame:
        input.bodyFrame === "balanced" ||
        input.bodyFrame === "athletic" ||
        input.bodyFrame === "soft" ||
        input.bodyFrame === "curvy"
          ? input.bodyFrame
          : defaultBodyProfile.bodyFrame,
      simple: {
        ...defaultBodyProfileSimple,
        ...pickNumericFields(input.simple, bodyProfileSimpleKeys),
      },
      detailed: isRecord(input.detailed)
        ? {
            ...defaultBodyProfileDetailed,
            ...pickNumericFields(input.detailed, bodyProfileDetailedKeys),
          }
        : { ...defaultBodyProfileDetailed },
    };
  }

  if (isLegacyBodyProfileFlat(input)) {
    return {
      version: 2,
      gender:
        input.gender === "female" || input.gender === "male" || input.gender === "neutral"
          ? input.gender
          : defaultBodyProfile.gender,
      bodyFrame:
        input.bodyFrame === "balanced" ||
        input.bodyFrame === "athletic" ||
        input.bodyFrame === "soft" ||
        input.bodyFrame === "curvy"
          ? input.bodyFrame
          : defaultBodyProfile.bodyFrame,
      simple: {
        ...defaultBodyProfileSimple,
        ...pickNumericFields(input, bodyProfileSimpleKeys),
      },
      detailed: {
        ...defaultBodyProfileDetailed,
        ...pickNumericFields(input, bodyProfileDetailedKeys),
      },
    };
  }

  return {
    version: 2,
    gender: defaultBodyProfile.gender,
    bodyFrame: defaultBodyProfile.bodyFrame,
    simple: { ...defaultBodyProfileSimple },
    detailed: { ...defaultBodyProfileDetailed },
  };
};

export const flattenBodyProfile = (profile: BodyProfile): FlattenedBodyProfile => ({
  ...profile.simple,
  ...(profile.detailed ?? {}),
});

export const getBodyMeasurement = <K extends keyof FlattenedBodyProfile>(profile: BodyProfile, key: K) =>
  flattenBodyProfile(profile)[key];

export const setSimpleBodyMeasurement = <K extends keyof BodyProfileSimple>(
  profile: BodyProfile,
  key: K,
  value: BodyProfileSimple[K],
): BodyProfile => ({
  ...profile,
  simple: {
    ...profile.simple,
    [key]: value,
  },
});

export const setDetailedBodyMeasurement = <K extends keyof BodyProfileDetailed>(
  profile: BodyProfile,
  key: K,
  value: BodyProfileDetailed[K],
): BodyProfile => ({
  ...profile,
  detailed: {
    ...(profile.detailed ?? {}),
    [key]: value,
  },
});

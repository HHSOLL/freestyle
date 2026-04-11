export const bodyProfileSimpleKeys = [
  'heightCm',
  'shoulderCm',
  'chestCm',
  'waistCm',
  'hipCm',
  'inseamCm',
] as const;

export const bodyProfileDetailedKeys = [
  'neckCm',
  'torsoLengthCm',
  'armLengthCm',
  'sleeveLengthCm',
  'bicepCm',
  'forearmCm',
  'wristCm',
  'riseCm',
  'outseamCm',
  'thighCm',
  'kneeCm',
  'calfCm',
  'ankleCm',
] as const;

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
  neckCm?: number;
  torsoLengthCm?: number;
  armLengthCm?: number;
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
  simple: BodyProfileSimple;
  detailed?: BodyProfileDetailed;
};

export type LegacyBodyProfileFlat = BodyProfileSimple & BodyProfileDetailed;
export type FlattenedBodyProfile = LegacyBodyProfileFlat;

export const defaultBodyProfileSimple: BodyProfileSimple = Object.freeze({
  heightCm: 172,
  shoulderCm: 44,
  chestCm: 94,
  waistCm: 78,
  hipCm: 95,
  inseamCm: 79,
});

export const defaultBodyProfileDetailed: BodyProfileDetailed = Object.freeze({});

export const defaultBodyProfile: BodyProfile = Object.freeze({
  simple: { ...defaultBodyProfileSimple },
  detailed: { ...defaultBodyProfileDetailed },
});

export type GarmentMeasurements = {
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  shoulderCm?: number;
  sleeveLengthCm?: number;
  lengthCm?: number;
  inseamCm?: number;
  riseCm?: number;
  hemCm?: number;
};

export type GarmentFitProfile = {
  silhouette?: 'tailored' | 'regular' | 'relaxed' | 'oversized';
  layer?: 'base' | 'mid' | 'outer';
  structure?: 'soft' | 'balanced' | 'structured';
  stretch?: number;
  drape?: number;
};

export type AssetCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'custom';
export type AssetSource = 'inventory' | 'upload' | 'url' | 'import';

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
    strategy?: 'remote_remove_bg' | 'embedded_alpha' | 'local_heuristic';
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

export type BodyProfileRecord = {
  profile: BodyProfile;
  version: 1;
  updatedAt?: string;
};

export type BodyProfileUpsertInput = {
  profile: BodyProfile;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickNumericFields = <T extends readonly string[]>(
  input: Record<string, unknown>,
  keys: T
): Partial<Record<T[number], number>> => {
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
    const simple = {
      ...defaultBodyProfileSimple,
      ...pickNumericFields(input.simple, bodyProfileSimpleKeys),
    };
    const detailed = isRecord(input.detailed)
      ? {
          ...pickNumericFields(input.detailed, bodyProfileDetailedKeys),
        }
      : {};
    return {
      simple,
      detailed,
    };
  }

  if (isLegacyBodyProfileFlat(input)) {
    return {
      simple: {
        ...defaultBodyProfileSimple,
        ...pickNumericFields(input, bodyProfileSimpleKeys),
      },
      detailed: {
        ...pickNumericFields(input, bodyProfileDetailedKeys),
      },
    };
  }

  return {
    simple: { ...defaultBodyProfileSimple },
    detailed: { ...defaultBodyProfileDetailed },
  };
};

export const flattenBodyProfile = (profile: BodyProfile): FlattenedBodyProfile => ({
  ...profile.simple,
  ...(profile.detailed ?? {}),
});

export const getBodyMeasurement = <K extends keyof FlattenedBodyProfile>(
  profile: BodyProfile,
  key: K
): FlattenedBodyProfile[K] => flattenBodyProfile(profile)[key];

export const setSimpleBodyMeasurement = <K extends keyof BodyProfileSimple>(
  profile: BodyProfile,
  key: K,
  value: BodyProfileSimple[K]
): BodyProfile => ({
  ...profile,
  simple: {
    ...profile.simple,
    [key]: value,
  },
});

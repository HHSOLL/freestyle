export type BodyProfile = {
  heightCm: number;
  shoulderCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  inseamCm: number;
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

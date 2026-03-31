import type { Asset, EditableAssetCategory, GarmentMeasurements, GarmentFitProfile } from './types';

export type BodyProfile = {
  heightCm: number;
  shoulderCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  inseamCm: number;
};

export type FitSeverity = 'tight' | 'trim' | 'regular' | 'relaxed' | 'oversized';

export type GarmentFitSummary = {
  label: string;
  severity: FitSeverity;
  easeCm: number;
};

export type GarmentLayerConfig = {
  assetId: string;
  name: string;
  category: EditableAssetCategory;
  layerOrder: number;
  shellWidth: number;
  shellDepth: number;
  shellHeight: number;
  shellYOffset: number;
  limbWidth?: number;
  limbLength?: number;
  hemWidth?: number;
  color: string;
  textureUrl: string;
  measurements: GarmentMeasurements;
  fitProfile: GarmentFitProfile;
  fitSummary: GarmentFitSummary[];
};

export const defaultBodyProfile: BodyProfile = {
  heightCm: 172,
  shoulderCm: 44,
  chestCm: 94,
  waistCm: 78,
  hipCm: 95,
  inseamCm: 79,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const inferBaseMeasurements = (category: EditableAssetCategory, body: BodyProfile): GarmentMeasurements => {
  switch (category) {
    case 'tops':
      return {
        chestCm: body.chestCm + 10,
        waistCm: body.waistCm + 8,
        shoulderCm: body.shoulderCm + 3,
        sleeveLengthCm: 61,
        lengthCm: 66,
        hemCm: body.waistCm + 10,
      };
    case 'outerwear':
      return {
        chestCm: body.chestCm + 16,
        waistCm: body.waistCm + 14,
        shoulderCm: body.shoulderCm + 4,
        sleeveLengthCm: 63,
        lengthCm: 71,
        hemCm: body.hipCm + 8,
      };
    case 'bottoms':
      return {
        waistCm: body.waistCm + 6,
        hipCm: body.hipCm + 8,
        inseamCm: body.inseamCm,
        riseCm: 31,
        hemCm: 38,
        lengthCm: body.inseamCm + 30,
      };
    case 'shoes':
      return {
        lengthCm: 30,
        hemCm: 12,
      };
    case 'accessories':
      return {
        lengthCm: 28,
      };
    case 'custom':
      return {
        chestCm: body.chestCm + 10,
        waistCm: body.waistCm + 10,
        hipCm: body.hipCm + 10,
        lengthCm: 68,
      };
  }
};

const inferMeasurementsFromAspect = (
  category: EditableAssetCategory,
  aspectRatio: number | undefined,
  body: BodyProfile
): GarmentMeasurements => {
  const base = inferBaseMeasurements(category, body);
  if (!aspectRatio || !Number.isFinite(aspectRatio)) return base;

  if (category === 'tops' || category === 'outerwear') {
    const lengthMultiplier = clamp(1 / Math.max(aspectRatio, 0.55), 0.82, 1.28);
    return {
      ...base,
      lengthCm: Math.round((base.lengthCm ?? 68) * lengthMultiplier),
    };
  }

  if (category === 'bottoms') {
    const inseamMultiplier = clamp(1 / Math.max(aspectRatio, 0.4), 0.88, 1.16);
    return {
      ...base,
      inseamCm: Math.round((base.inseamCm ?? body.inseamCm) * inseamMultiplier),
      lengthCm: Math.round((base.lengthCm ?? body.inseamCm + 30) * inseamMultiplier),
    };
  }

  return base;
};

export const getAssetAspectRatio = (asset: Asset) => {
  const width = asset.metadata?.originalSize?.width;
  const height = asset.metadata?.originalSize?.height;
  if (!width || !height) return undefined;
  return width / height;
};

export const resolveGarmentMeasurements = (asset: Asset, body: BodyProfile): GarmentMeasurements => {
  const inferred = inferMeasurementsFromAspect(asset.category, getAssetAspectRatio(asset), body);
  return {
    ...inferred,
    ...(asset.metadata?.measurements ?? {}),
  };
};

export const resolveFitProfile = (asset: Asset): GarmentFitProfile => {
  const existing = asset.metadata?.fitProfile ?? {};
  if (existing.layer && existing.silhouette) {
    return existing;
  }

  if (asset.category === 'outerwear') {
    return {
      layer: 'outer',
      silhouette: 'relaxed',
      structure: 'structured',
      stretch: 0.15,
      drape: 0.4,
      ...existing,
    };
  }

  if (asset.category === 'tops') {
    return {
      layer: 'mid',
      silhouette: 'regular',
      structure: 'balanced',
      stretch: 0.25,
      drape: 0.55,
      ...existing,
    };
  }

  if (asset.category === 'bottoms') {
    return {
      layer: 'base',
      silhouette: 'regular',
      structure: 'balanced',
      stretch: 0.2,
      drape: 0.45,
      ...existing,
    };
  }

  return {
    layer: 'mid',
    silhouette: 'regular',
    structure: 'balanced',
    stretch: 0.2,
    drape: 0.5,
    ...existing,
  };
};

const layerOrderMap: Record<NonNullable<GarmentFitProfile['layer']>, number> = {
  base: 1,
  mid: 2,
  outer: 3,
};

const fitSeverityFromEase = (easeCm: number): FitSeverity => {
  if (easeCm < 0) return 'tight';
  if (easeCm < 4) return 'trim';
  if (easeCm < 10) return 'regular';
  if (easeCm < 18) return 'relaxed';
  return 'oversized';
};

const fitLabel = (severity: FitSeverity) => {
  switch (severity) {
    case 'tight':
      return 'Tight';
    case 'trim':
      return 'Trim';
    case 'regular':
      return 'Regular';
    case 'relaxed':
      return 'Relaxed';
    case 'oversized':
      return 'Oversized';
  }
};

const buildFitSummaries = (category: EditableAssetCategory, body: BodyProfile, measurements: GarmentMeasurements) => {
  const summaries: GarmentFitSummary[] = [];

  if (category === 'tops' || category === 'outerwear' || category === 'custom') {
    const chestEase = (measurements.chestCm ?? body.chestCm) - body.chestCm;
    const waistEase = (measurements.waistCm ?? body.waistCm) - body.waistCm;
    const sleeveEase = (measurements.sleeveLengthCm ?? 61) - 61;
    summaries.push({
      label: `Chest ${fitLabel(fitSeverityFromEase(chestEase))}`,
      severity: fitSeverityFromEase(chestEase),
      easeCm: Math.round(chestEase * 10) / 10,
    });
    summaries.push({
      label: `Waist ${fitLabel(fitSeverityFromEase(waistEase))}`,
      severity: fitSeverityFromEase(waistEase),
      easeCm: Math.round(waistEase * 10) / 10,
    });
    summaries.push({
      label: sleeveEase < -2 ? 'Short sleeve' : sleeveEase > 4 ? 'Long sleeve' : 'Balanced sleeve',
      severity: sleeveEase < -2 ? 'tight' : sleeveEase > 4 ? 'relaxed' : 'regular',
      easeCm: Math.round(sleeveEase * 10) / 10,
    });
    return summaries;
  }

  if (category === 'bottoms') {
    const waistEase = (measurements.waistCm ?? body.waistCm) - body.waistCm;
    const hipEase = (measurements.hipCm ?? body.hipCm) - body.hipCm;
    const inseamDelta = (measurements.inseamCm ?? body.inseamCm) - body.inseamCm;
    summaries.push({
      label: `Waist ${fitLabel(fitSeverityFromEase(waistEase))}`,
      severity: fitSeverityFromEase(waistEase),
      easeCm: Math.round(waistEase * 10) / 10,
    });
    summaries.push({
      label: `Hip ${fitLabel(fitSeverityFromEase(hipEase))}`,
      severity: fitSeverityFromEase(hipEase),
      easeCm: Math.round(hipEase * 10) / 10,
    });
    summaries.push({
      label: inseamDelta < -2 ? 'Cropped length' : inseamDelta > 4 ? 'Long length' : 'Balanced length',
      severity: inseamDelta < -2 ? 'tight' : inseamDelta > 4 ? 'relaxed' : 'regular',
      easeCm: Math.round(inseamDelta * 10) / 10,
    });
  }

  return summaries;
};

export const buildGarmentLayerConfig = (asset: Asset, body: BodyProfile): GarmentLayerConfig => {
  const measurements = resolveGarmentMeasurements(asset, body);
  const fitProfile = resolveFitProfile(asset);
  const layer = fitProfile.layer ?? 'mid';
  const layerOrder = layerOrderMap[layer];
  const color = asset.metadata?.dominantColor ?? '#d9d3cb';

  if (asset.category === 'bottoms') {
    const hipEase = (measurements.hipCm ?? body.hipCm + 6) - body.hipCm;
    const shellWidth = (measurements.hipCm ?? body.hipCm + 8) / 110;
    const shellDepth = Math.max(0.78, body.hipCm / 120 + hipEase / 80);
    const shellHeight = (measurements.lengthCm ?? body.inseamCm + 30) / 95;
    return {
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      layerOrder,
      shellWidth,
      shellDepth,
      shellHeight,
      shellYOffset: -1.22,
      limbWidth: Math.max(0.34, (measurements.hemCm ?? 38) / 65),
      limbLength: Math.max(1.2, (measurements.inseamCm ?? body.inseamCm) / 52),
      hemWidth: (measurements.hemCm ?? 38) / 60,
      color,
      textureUrl: asset.imageSrc,
      measurements,
      fitProfile,
      fitSummary: buildFitSummaries(asset.category, body, measurements),
    };
  }

  if (asset.category === 'shoes') {
    return {
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      layerOrder,
      shellWidth: 0.5,
      shellDepth: 1.1,
      shellHeight: 0.24,
      shellYOffset: -2.12,
      color,
      textureUrl: asset.imageSrc,
      measurements,
      fitProfile,
      fitSummary: [
        {
          label: 'Footwear preview',
          severity: 'regular',
          easeCm: 0,
        },
      ],
    };
  }

  const chestEase = (measurements.chestCm ?? body.chestCm + 8) - body.chestCm;
  const waistEase = (measurements.waistCm ?? body.waistCm + 8) - body.waistCm;
  const shoulderEase = (measurements.shoulderCm ?? body.shoulderCm + 2) - body.shoulderCm;
  return {
    assetId: asset.id,
    name: asset.name,
    category: asset.category,
    layerOrder,
    shellWidth: Math.max(0.95, body.chestCm / 105 + chestEase / 70),
    shellDepth: Math.max(0.68, body.waistCm / 120 + waistEase / 90),
    shellHeight: Math.max(0.95, (measurements.lengthCm ?? 68) / 62),
    shellYOffset: asset.category === 'outerwear' ? 0.08 : 0.15,
    limbWidth: Math.max(0.24, (measurements.shoulderCm ?? body.shoulderCm) / 95 + shoulderEase / 120),
    limbLength: Math.max(1.1, (measurements.sleeveLengthCm ?? 61) / 44),
    hemWidth: Math.max(0.8, (measurements.hemCm ?? body.waistCm + 8) / 90),
    color,
    textureUrl: asset.imageSrc,
    measurements,
    fitProfile,
    fitSummary: buildFitSummaries(asset.category, body, measurements),
  };
};

export const buildFittingLayers = (assets: Asset[], body: BodyProfile) =>
  assets
    .filter((asset) => asset.category !== 'accessories')
    .map((asset) => buildGarmentLayerConfig(asset, body))
    .sort((left, right) => left.layerOrder - right.layerOrder);

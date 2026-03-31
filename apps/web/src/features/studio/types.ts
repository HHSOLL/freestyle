export type AssetCategory = 'all' | 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'custom';
export type EditableAssetCategory = Exclude<AssetCategory, 'all'>;
export type AssetSource = 'inventory' | 'upload' | 'url' | 'import';
export type CanvasSize = 'auto' | 'square' | 'portrait' | 'custom';

export type GarmentMeasurements = Partial<{
  chestCm: number;
  waistCm: number;
  hipCm: number;
  shoulderCm: number;
  sleeveLengthCm: number;
  lengthCm: number;
  inseamCm: number;
  riseCm: number;
  hemCm: number;
}>;

export type GarmentFitProfile = Partial<{
  silhouette: 'tailored' | 'regular' | 'relaxed' | 'oversized';
  layer: 'base' | 'mid' | 'outer';
  structure: 'soft' | 'balanced' | 'structured';
  stretch: number;
  drape: number;
}>;

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

export interface Asset {
  id: string;
  name: string;
  imageSrc: string;
  category: EditableAssetCategory;
  price?: number;
  brand?: string;
  source: AssetSource;
  removedBackground?: boolean;
  sourceUrl?: string;
  metadata?: AssetMetadata;
  garmentProfile?: GarmentProfile;
}

export interface CanvasItem {
  id: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  scale: number;
  rotation: number;
  zIndex: number;
}

export type StudioCategoryOption = {
  id: AssetCategory;
  label: string;
};

export type StudioTranslator = (key: string) => string;

import type {
  BodyProfile as CanonicalBodyProfile,
  GarmentFitProfile,
  GarmentMeasurements,
  GarmentProfile,
} from '@freestyle/contracts/domain-types';

export type { GarmentFitProfile, GarmentMeasurements, GarmentProfile };

export type AssetCategory = 'all' | 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'custom';
export type EditableAssetCategory = Exclude<AssetCategory, 'all'>;
export type AssetSource = 'inventory' | 'upload' | 'url' | 'import';
export type CanvasSize = 'auto' | 'square' | 'portrait' | 'custom';

export type BodyProfile = CanonicalBodyProfile;

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

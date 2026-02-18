export type AssetCategory = 'all' | 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'custom';
export type EditableAssetCategory = Exclude<AssetCategory, 'all'>;
export type AssetSource = 'inventory' | 'upload' | 'url' | 'import';
export type CanvasSize = 'auto' | 'square' | 'portrait' | 'custom';

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

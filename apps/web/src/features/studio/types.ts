import type { AssetCategory as CanonicalAssetCategory } from '@freestyle/contracts/domain-types';

export type AssetCategory = 'all' | CanonicalAssetCategory;
export type EditableAssetCategory = CanonicalAssetCategory;
export type CanvasSize = 'auto' | 'square' | 'portrait' | 'custom';

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

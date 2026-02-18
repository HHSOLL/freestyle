import type { AssetSource, CanvasSize, EditableAssetCategory } from './types';

export const presetColors = [
  '#F8F9FA',
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#4CD964',
  '#007AFF',
  '#FFCC00',
  '#5856D6',
  '#FF9500',
  '#F5E6D3',
] as const;

export const editableAssetCategories: EditableAssetCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'accessories',
  'custom',
];

export const assetSources: AssetSource[] = ['inventory', 'upload', 'url', 'import'];

export const canvasSizeOptions: CanvasSize[] = ['auto', 'square', 'portrait', 'custom'];

export const DEFAULT_CANVAS_BACKGROUND = '#F8F9FA';
export const DEFAULT_TEXT_COLOR = '#000000';
export const DEFAULT_TEXT_SIZE = 48;

export const DEFAULT_CUSTOM_RATIO = {
  w: 16,
  h: 9,
};

export const DEFAULT_CANVAS_WIDTH_PERCENT = 92;

import { assetSources, editableAssetCategories } from './constants';
import type { Asset, AssetSource, EditableAssetCategory } from './types';

export const isEditableAssetCategory = (value: string): value is EditableAssetCategory =>
  editableAssetCategories.includes(value as EditableAssetCategory);

export const isAssetSource = (value: string): value is AssetSource =>
  assetSources.includes(value as AssetSource);

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const formatSourceLink = (sourceUrl: string) => {
  try {
    const parsed = new URL(sourceUrl);
    const trimmedPath =
      parsed.pathname.length > 36 ? `${parsed.pathname.slice(0, 33)}...` : parsed.pathname;
    return `${parsed.hostname}${trimmedPath}`;
  } catch {
    return sourceUrl.length > 52 ? `${sourceUrl.slice(0, 49)}...` : sourceUrl;
  }
};

export const toAsset = (value: unknown): Asset | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.imageSrc !== 'string'
  ) {
    return null;
  }

  const category =
    typeof record.category === 'string' && isEditableAssetCategory(record.category)
      ? record.category
      : 'custom';
  const source =
    typeof record.source === 'string' && isAssetSource(record.source)
      ? record.source
      : 'upload';

  return {
    id: record.id,
    name: record.name,
    imageSrc: record.imageSrc,
    category,
    source,
    removedBackground:
      typeof record.removedBackground === 'boolean' ? record.removedBackground : undefined,
    price: typeof record.price === 'number' ? record.price : undefined,
    brand: typeof record.brand === 'string' ? record.brand : undefined,
    sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined,
  };
};

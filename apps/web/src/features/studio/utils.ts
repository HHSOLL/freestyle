import { assetSources, editableAssetCategories } from './constants';
import type { Asset, AssetMetadata, AssetSource, GarmentProfile } from '@freestyle/contracts/domain-types';
import type { EditableAssetCategory } from './types';

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

const toGarmentProfile = (value: unknown): GarmentProfile | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return undefined;
  return record as unknown as GarmentProfile;
};

export const toAsset = (value: unknown): Asset | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string') {
    return null;
  }

  const imageSrc = (() => {
    if (typeof record.imageSrc === 'string' && record.imageSrc.trim()) return record.imageSrc;
    if (typeof record.cutout_image_url === 'string' && record.cutout_image_url.trim()) {
      return record.cutout_image_url;
    }
    if (typeof record.original_image_url === 'string' && record.original_image_url.trim()) {
      return record.original_image_url;
    }
    return '';
  })();

  if (!imageSrc) return null;

  const category =
    typeof record.category === 'string' && isEditableAssetCategory(record.category)
      ? record.category
      : 'custom';
  const source =
    typeof record.source === 'string' && isAssetSource(record.source)
      ? record.source
      : (typeof record.product_id === 'string' ? 'import' : 'upload');

  const metadata = (() => {
    if (!record.metadata || typeof record.metadata !== 'object' || Array.isArray(record.metadata)) return undefined;
    return record.metadata as AssetMetadata;
  })();

  const name =
    typeof record.name === 'string' && record.name.trim().length > 0
      ? record.name.trim()
      : typeof metadata?.sourceTitle === 'string' && metadata.sourceTitle.trim().length > 0
        ? metadata.sourceTitle.trim()
      : `${category}-${record.id.slice(0, 8)}`;

  return {
    id: record.id,
    name,
    imageSrc,
    category,
    source,
    removedBackground:
      typeof record.removedBackground === 'boolean'
        ? record.removedBackground
        : typeof record.cutout_image_url === 'string',
    price: typeof record.price === 'number' ? record.price : undefined,
    brand:
      typeof record.brand === 'string'
        ? record.brand
        : typeof metadata?.sourceBrand === 'string'
          ? metadata.sourceBrand
          : undefined,
    metadata,
    garmentProfile: toGarmentProfile(metadata?.garmentProfile),
    sourceUrl:
      typeof record.sourceUrl === 'string'
        ? record.sourceUrl
        : typeof metadata?.sourceUrl === 'string'
          ? metadata.sourceUrl
        : typeof record.source_url === 'string'
          ? record.source_url
          : undefined,
  };
};

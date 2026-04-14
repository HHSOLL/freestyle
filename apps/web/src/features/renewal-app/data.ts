import type { RenewalLanguage } from '@/features/renewal-app/content';

export type WardrobeLook = {
  id: string;
  shareSlug: string;
  title: string;
  previewImage: string;
  createdAt: string;
};

export type WardrobeAsset = {
  id: string;
  name: string;
  imageSrc: string;
  category: string;
  source: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toWardrobeLook = (value: unknown): WardrobeLook | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.share_slug !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.preview_image !== 'string' ||
    typeof value.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    shareSlug: value.share_slug,
    title: value.title,
    previewImage: value.preview_image,
    createdAt: value.created_at,
  };
};

export const toWardrobeAsset = (value: unknown): WardrobeAsset | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const imageSrc =
    typeof value.imageSrc === 'string'
      ? value.imageSrc
      : typeof value.cutout_image_url === 'string'
        ? value.cutout_image_url
        : typeof value.original_image_url === 'string'
          ? value.original_image_url
          : null;

  if (!imageSrc) return null;

  const category = typeof value.category === 'string' && value.category.trim() ? value.category : 'custom';
  const source = typeof value.source === 'string' && value.source.trim() ? value.source : 'import';
  const name =
    typeof value.name === 'string' && value.name.trim()
      ? value.name
      : `${category}-${value.id.slice(0, 8)}`;

  return {
    id: value.id,
    name,
    imageSrc,
    category,
    source,
  };
};

export const closetCategories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'hair', 'custom'] as const;

export const closetCategoryLabels: Record<RenewalLanguage, Record<(typeof closetCategories)[number], string>> = {
  ko: {
    tops: '상의',
    bottoms: '하의',
    outerwear: '아우터',
    shoes: '신발',
    accessories: '액세서리',
    hair: '헤어',
    custom: '커스텀',
  },
  en: {
    tops: 'Tops',
    bottoms: 'Bottoms',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    accessories: 'Accessories',
    hair: 'Hair',
    custom: 'Custom',
  },
};

const sourceLabels: Record<RenewalLanguage, Record<string, string>> = {
  ko: {
    import: '가져옴',
    inventory: '샘플',
    uploaded: '업로드',
    upload: '업로드',
    product_url: '링크',
    cart_url: '장바구니',
    custom: '커스텀',
  },
  en: {
    import: 'Import',
    inventory: 'Demo',
    uploaded: 'Upload',
    upload: 'Upload',
    product_url: 'Link',
    cart_url: 'Cart',
    custom: 'Custom',
  },
};

export const getClosetCategoryLabel = (category: string, language: RenewalLanguage = 'en') =>
  closetCategoryLabels[language][category as keyof (typeof closetCategoryLabels)[typeof language]] ?? category;

export const getWardrobeSourceLabel = (source: string, language: RenewalLanguage = 'en') =>
  sourceLabels[language][source] ?? source;

export const formatWardrobeDate = (value: string, language: RenewalLanguage = 'en') =>
  new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

export const summarizeCloset = (assets: WardrobeAsset[]) => {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  }

  const missing = closetCategories.filter((category) => category !== 'custom' && !counts.has(category));
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const mostCommon = sorted[0]?.[0] ?? null;
  const duplicateRisk = sorted.filter(([, count]) => count >= 4).map(([category]) => category);

  return {
    counts,
    missing,
    mostCommon,
    duplicateRisk,
  };
};

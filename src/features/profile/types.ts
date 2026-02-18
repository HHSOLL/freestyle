export type OutfitSummary = {
  id: string;
  share_slug: string;
  title: string;
  preview_image: string;
  created_at: string;
};

export type AssetSummary = {
  id: string;
  name: string;
  imageSrc: string;
  category: string;
  source: string;
};

export type ProfileTab = 'archive' | 'assets';
export type ProfileTranslator = (key: string) => string;

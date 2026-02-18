'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { ProfileAssetsSection } from '@/features/profile/components/ProfileAssetsSection';
import { ProfileArchiveSection } from '@/features/profile/components/ProfileArchiveSection';
import { ProfileHeaderCard } from '@/features/profile/components/ProfileHeaderCard';
import { ProfileTabs } from '@/features/profile/components/ProfileTabs';
import type { AssetSummary, OutfitSummary, ProfileTab } from '@/features/profile/types';

const toOutfitSummary = (value: unknown): OutfitSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    typeof item.share_slug !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.preview_image !== 'string' ||
    typeof item.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    share_slug: item.share_slug,
    title: item.title,
    preview_image: item.preview_image,
    created_at: item.created_at,
  };
};

const toAssetSummary = (value: unknown): AssetSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.imageSrc !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.source !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    imageSrc: item.imageSrc,
    category: item.category,
    source: item.source,
  };
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ProfileTab>('archive');
  const [outfits, setOutfits] = useState<OutfitSummary[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [archiveQuery, setArchiveQuery] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [assetCategory, setAssetCategory] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [outfitsRes, assetsRes] = await Promise.all([fetch('/api/outfits'), fetch('/api/assets')]);
        const outfitsData = await outfitsRes.json();
        const assetsData = await assetsRes.json();

        if (outfitsRes.ok && Array.isArray(outfitsData?.outfits)) {
          const parsedOutfits = outfitsData.outfits
            .map((item: unknown) => toOutfitSummary(item))
            .filter((item: OutfitSummary | null): item is OutfitSummary => Boolean(item));
          setOutfits(parsedOutfits);
        }

        if (assetsRes.ok && Array.isArray(assetsData?.assets)) {
          const parsedAssets = assetsData.assets
            .map((item: unknown) => toAssetSummary(item))
            .filter((item: AssetSummary | null): item is AssetSummary => Boolean(item));
          setAssets(parsedAssets);
        }
      } catch {
        // ignore loading failures
      }
    };

    loadData();
  }, []);

  const filteredOutfits = useMemo(() => {
    const query = archiveQuery.trim().toLowerCase();
    if (!query) return outfits;
    return outfits.filter((outfit) => outfit.title.toLowerCase().includes(query));
  }, [archiveQuery, outfits]);

  const getCategoryLabel = (category: string) => {
    if (category === 'tops') return t('studio.categories.tops');
    if (category === 'bottoms') return t('studio.categories.bottoms');
    if (category === 'outerwear') return t('studio.categories.outerwear');
    if (category === 'shoes') return t('studio.categories.shoes');
    if (category === 'accessories') return t('studio.categories.accessories');
    if (category === 'custom') return t('studio.categories.custom');
    return category;
  };

  const assetCategories = useMemo(() => {
    const categorySet = new Set(assets.map((asset) => asset.category || 'custom'));
    return ['all', ...Array.from(categorySet)];
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      if (assetCategory !== 'all' && asset.category !== assetCategory) return false;
      if (!query) return true;
      return asset.name.toLowerCase().includes(query);
    });
  }, [assetCategory, assetQuery, assets]);

  const handleCopyShare = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      setCopiedSlug(null);
    }
  };

  const deleteOutfit = async (id: string) => {
    await fetch(`/api/outfits/${id}`, { method: 'DELETE' });
    setOutfits((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteAsset = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    setAssets((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-24 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <ProfileHeaderCard t={t} outfitCount={outfits.length} assetCount={assets.length} />

        <ProfileTabs t={t} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'archive' ? (
          <ProfileArchiveSection
            t={t}
            query={archiveQuery}
            onQueryChange={setArchiveQuery}
            outfits={filteredOutfits}
            copiedSlug={copiedSlug}
            onCopyShare={handleCopyShare}
            onDeleteOutfit={deleteOutfit}
          />
        ) : (
          <ProfileAssetsSection
            t={t}
            query={assetQuery}
            onQueryChange={setAssetQuery}
            selectedCategory={assetCategory}
            onCategoryChange={setAssetCategory}
            categories={assetCategories}
            getCategoryLabel={getCategoryLabel}
            assets={filteredAssets}
            onDeleteAsset={deleteAsset}
          />
        )}
      </div>
    </div>
  );
}

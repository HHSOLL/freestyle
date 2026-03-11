'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGate } from '@/components/auth/AuthGate';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
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
  if (typeof item.id !== 'string') {
    return null;
  }

  const imageSrc =
    typeof item.imageSrc === 'string'
      ? item.imageSrc
      : typeof item.cutout_image_url === 'string'
        ? item.cutout_image_url
        : typeof item.original_image_url === 'string'
          ? item.original_image_url
          : null;

  if (!imageSrc) return null;

  const category = typeof item.category === 'string' && item.category.trim() ? item.category : 'custom';
  const source = typeof item.source === 'string' && item.source.trim() ? item.source : 'import';
  const name =
    typeof item.name === 'string' && item.name.trim()
      ? item.name
      : `${category}-${item.id.slice(0, 8)}`;

  return {
    id: item.id,
    name,
    imageSrc,
    category,
    source,
  };
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const { isLoading: isAuthLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('archive');
  const [outfits, setOutfits] = useState<OutfitSummary[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [archiveQuery, setArchiveQuery] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [assetCategory, setAssetCategory] = useState('all');

  useEffect(() => {
    if (isAuthLoading || !user) return;
    const loadData = async () => {
      try {
        const [{ response: outfitsRes, data: outfitsData }, { response: assetsRes, data: assetsData }] =
          await Promise.all([
            apiFetchJson<{ outfits?: unknown[] }>('/v1/outfits'),
            apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>('/v1/assets?page=1&page_size=200'),
          ]);

        if (outfitsRes.ok && Array.isArray(outfitsData?.outfits)) {
          const parsedOutfits = outfitsData.outfits
            .map((item: unknown) => toOutfitSummary(item))
            .filter((item: OutfitSummary | null): item is OutfitSummary => Boolean(item));
          setOutfits(parsedOutfits);
        }

        if (assetsRes.ok && Array.isArray(assetsData?.items || assetsData?.assets)) {
          const source = (assetsData?.items || assetsData?.assets) as unknown[];
          const parsedAssets = source
            .map((item: unknown) => toAssetSummary(item))
            .filter((item: AssetSummary | null): item is AssetSummary => Boolean(item));
          setAssets(parsedAssets);
        }
      } catch {
        // ignore loading failures
      }
    };

    loadData();
  }, [isAuthLoading, user]);

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
    try {
      const { response, data } = await apiFetchJson<Record<string, unknown>>(`/v1/outfits/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to delete outfit.'));
      }
      setOutfits((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete outfit.';
      alert(message);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      const { response, data } = await apiFetchJson<Record<string, unknown>>(`/v1/assets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to delete asset.'));
      }
      setAssets((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete asset.';
      alert(message);
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-[calc(100vh-4rem)] bg-[#F8F9FA]" />;
  }

  if (!user) {
    return (
      <AuthGate
        title="Profile Access"
        description="보관한 코디와 등록한 에셋은 로그인한 사용자 기준으로만 조회됩니다."
      />
    );
  }

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

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { AssetSummary, ProfileTranslator } from '../types';

type ProfileAssetsSectionProps = {
  t: ProfileTranslator;
  query: string;
  onQueryChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  getCategoryLabel: (category: string) => string;
  assets: AssetSummary[];
  onDeleteAsset: (id: string) => void;
};

export function ProfileAssetsSection({
  t,
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  categories,
  getCategoryLabel,
  assets,
  onDeleteAsset,
}: ProfileAssetsSectionProps) {
  return (
    <>
      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('profile.search.asset_placeholder')}
          className="w-full md:max-w-md rounded-full border border-black/10 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20"
        />
        <select
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full md:max-w-[180px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'all' ? t('profile.filter.all') : getCategoryLabel(category)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-10 grid gap-4 md:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
        {assets.length === 0 && (
          <div className="col-span-full text-sm text-black/40">{t('profile.empty.assets')}</div>
        )}
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-white rounded-[16px] md:rounded-[24px] border border-black/5 overflow-hidden shadow-lg shadow-black/[0.04]"
          >
            <div className="relative aspect-[3/4] bg-black/5">
              <Image
                src={asset.imageSrc}
                alt={asset.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="absolute inset-0 w-full h-full object-contain"
                unoptimized
              />
              <button
                onClick={() => onDeleteAsset(asset.id)}
                className="absolute right-3 top-3 bg-white/90 rounded-full p-2 text-black/40 hover:text-red-500"
                aria-label={t('profile.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold truncate">{asset.name}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 font-bold">
                {getCategoryLabel(asset.category)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

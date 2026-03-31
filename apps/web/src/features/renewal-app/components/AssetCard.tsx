'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { appChromeCopy } from '@/features/renewal-app/content';
import { getWardrobeSourceLabel, type WardrobeAsset } from '@/features/renewal-app/data';
import { useLanguage } from '@/lib/LanguageContext';

type AssetCardProps = {
  asset: WardrobeAsset;
  categoryLabel: string;
  onDelete?: (id: string) => void;
};

export function AssetCard({ asset, categoryLabel, onDelete }: AssetCardProps) {
  const { language } = useLanguage();
  const copy = appChromeCopy[language];

  return (
    <article className="overflow-hidden border border-black/8 bg-white">
      <div className="relative aspect-[3/4] bg-black/5">
        <Image
          src={asset.imageSrc}
          alt={asset.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain"
          unoptimized
        />
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-black/40 transition hover:text-red-500"
            aria-label={copy.deleteAsset}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="truncate font-semibold text-black">{asset.name}</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{categoryLabel}</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/28">{getWardrobeSourceLabel(asset.source, language)}</p>
        </div>
        <Link
          href={`/app/closet/item/${asset.id}`}
          className="inline-flex text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56 transition hover:text-black"
        >
          {copy.itemDetail}
        </Link>
      </div>
    </article>
  );
}

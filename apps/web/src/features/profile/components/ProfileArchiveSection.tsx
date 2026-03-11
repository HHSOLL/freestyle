import { Link as LinkIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { OutfitSummary, ProfileTranslator } from '../types';

type ProfileArchiveSectionProps = {
  t: ProfileTranslator;
  query: string;
  onQueryChange: (value: string) => void;
  outfits: OutfitSummary[];
  copiedSlug: string | null;
  onCopyShare: (slug: string) => void;
  onDeleteOutfit: (id: string) => void;
};

export function ProfileArchiveSection({
  t,
  query,
  onQueryChange,
  outfits,
  copiedSlug,
  onCopyShare,
  onDeleteOutfit,
}: ProfileArchiveSectionProps) {
  return (
    <>
      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('profile.search.archive_placeholder')}
          className="w-full md:max-w-md rounded-full border border-black/10 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20"
        />
      </div>

      <div className="mt-10 grid gap-4 md:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        {outfits.length === 0 && (
          <div className="col-span-full text-sm text-black/40">{t('profile.empty.archive')}</div>
        )}
        {outfits.map((outfit) => (
          <div
            key={outfit.id}
            className="bg-white rounded-[20px] md:rounded-[28px] border border-black/5 overflow-hidden shadow-lg shadow-black/[0.04]"
          >
            <div className="relative aspect-[3/4] bg-black/5">
              <Image
                src={outfit.preview_image}
                alt={outfit.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="absolute inset-0 w-full h-full object-contain"
                unoptimized
              />
              <button
                onClick={() => onDeleteOutfit(outfit.id)}
                className="absolute right-3 top-3 bg-white/90 rounded-full p-2 text-black/40 hover:text-red-500"
                aria-label={t('profile.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/30 font-bold">
                  {t('profile.archive.label')}
                </p>
                <h3 className="text-lg font-serif">{outfit.title}</h3>
              </div>
              <button
                onClick={() => onCopyShare(outfit.share_slug)}
                className="w-full flex items-center justify-center gap-2 border border-black/10 rounded-full py-2 text-[10px] uppercase tracking-[0.3em] font-bold text-black/50 hover:text-black"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {copiedSlug === outfit.share_slug ? t('profile.share.copied') : t('profile.share.copy')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

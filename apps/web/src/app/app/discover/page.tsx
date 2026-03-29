'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { INITIAL_TRENDS } from '@/features/trends/constants';
import { useLanguage } from '@/lib/LanguageContext';
import { summarizeCloset } from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';

export default function DiscoverPage() {
  const { t } = useLanguage();
  const { looks, assets } = useWardrobeSnapshot();
  const closetSummary = summarizeCloset(assets);
  const readyToRebuild = assets.length === 0 ? 0 : Math.min(INITIAL_TRENDS.length, Math.max(1, looks.length));

  return (
    <AppPageFrame
      eyebrow="Discover"
      title="Discovery becomes closet translation"
      description="Inspiration only matters when it can be rebuilt from the wardrobe you already own, or turned into a specific gap you can justify."
    >
      <InfoStrip
        items={[
          { label: 'Saved references', value: String(INITIAL_TRENDS.length) },
          { label: 'Closet ready', value: String(readyToRebuild) },
          { label: 'Missing anchors', value: String(closetSummary.missing.length) },
          { label: 'Saved looks', value: String(looks.length) },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INITIAL_TRENDS.map((trend) => (
          <article key={trend.id} className="overflow-hidden border border-black/8 bg-white">
            <div className="relative aspect-[4/5] bg-black/5">
              <Image
                src={trend.image}
                alt={t(trend.nameKey)}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="space-y-3 p-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-black/34">{trend.creator}</p>
                <h2 className="mt-2 font-serif text-2xl tracking-[-0.04em] text-black">{t(trend.nameKey)}</h2>
                <p className="mt-2 text-sm leading-7 text-black/58">{t(trend.descKey)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-black/8 pt-3 text-[11px] uppercase tracking-[0.16em] text-black/44">
                <span>{assets.length > 0 ? 'Ready to rebuild' : 'Need closet data first'}</span>
                <div className="flex gap-3">
                  <Link href="/app/looks/new" className="transition hover:text-black">
                    Rebuild
                  </Link>
                  <Link href="/app/decide" className="transition hover:text-black">
                    Decide
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </AppPageFrame>
  );
}

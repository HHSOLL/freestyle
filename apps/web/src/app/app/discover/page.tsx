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
  const { language, t } = useLanguage();
  const { looks, assets } = useWardrobeSnapshot();
  const closetSummary = summarizeCloset(assets);
  const readyToRebuild = assets.length === 0 ? 0 : Math.min(INITIAL_TRENDS.length, Math.max(1, looks.length));
  const copy =
    language === 'ko'
      ? {
          eyebrow: '발견',
          title: '발견은 곧 옷장 번역이 됩니다.',
          description: '영감은 이미 가진 옷으로 다시 만들 수 있거나, 정당화 가능한 공백으로 바뀔 때만 가치가 있습니다.',
          info: ['저장된 레퍼런스', '재구성 준비', '비어 있는 축', '저장된 캔버스'],
          ready: '재구성 가능',
          needsCloset: '먼저 옷장 데이터 필요',
          rebuild: '캔버스',
          decide: '옷장',
        }
      : {
          eyebrow: 'Discover',
          title: 'Discovery becomes closet translation',
          description: 'Inspiration only matters when it can be rebuilt from the wardrobe you already own, or turned into a specific gap you can justify.',
          info: ['Saved references', 'Closet ready', 'Missing anchors', 'Saved canvases'],
          ready: 'Ready to rebuild',
          needsCloset: 'Need closet data first',
          rebuild: 'Canvas',
          decide: 'Closet',
        };

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    >
      <InfoStrip
        items={[
          { label: copy.info[0], value: String(INITIAL_TRENDS.length) },
          { label: copy.info[1], value: String(readyToRebuild) },
          { label: copy.info[2], value: String(closetSummary.missing.length) },
          { label: copy.info[3], value: String(looks.length) },
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
                <span>{assets.length > 0 ? copy.ready : copy.needsCloset}</span>
                <div className="flex gap-3">
                  <Link href="/studio" className="transition hover:text-black">
                    {copy.rebuild}
                  </Link>
                  <Link href="/app/closet" className="transition hover:text-black">
                    {copy.decide}
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

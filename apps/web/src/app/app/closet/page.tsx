'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { AssetCard } from '@/features/renewal-app/components/AssetCard';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import {
  getClosetCategoryLabel,
  summarizeCloset,
} from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useLanguage } from '@/lib/LanguageContext';

export default function ClosetPage() {
  const { language } = useLanguage();
  const { assets, loading, error, deleteAsset } = useWardrobeSnapshot();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const deferredQuery = useDeferredValue(query);
  const closetSummary = useMemo(() => summarizeCloset(assets), [assets]);
  const fittingAssetId = assets[0]?.id ?? null;
  const copy =
    language === 'ko'
      ? {
          eyebrow: '옷장',
          title: '옷장을 정리하고 바로 마네킹 피팅으로 들어갑니다.',
          description: '저장한 옷을 정리하고, 필요한 순간엔 선택한 아이템을 커스텀 마네킹에 바로 입혀보는 옷장 기준 화면입니다.',
          info: ['추적 아이템', '중복 위험', '카테고리 공백', '가장 많은 축'],
          none: '없음',
          health: {
            eyebrow: '옷장 상태',
            missingTitle: `옷장을 더 유연하게 만들려면 ${closetSummary.missing
              .slice(0, 2)
              .map((entry) => getClosetCategoryLabel(entry, language).toLowerCase())
              .join(' 및 ')} 보강이 필요합니다.`,
            readyTitle: '핵심 카테고리는 갖춰졌습니다. 다음 단계는 반복을 줄이고 재사용률을 높이는 것입니다.',
            body: `중복 압력은 현재 ${
              closetSummary.duplicateRisk.length > 0
                ? closetSummary.duplicateRisk.map((entry) => getClosetCategoryLabel(entry, language).toLowerCase()).join(', ')
                : '뚜렷한 카테고리 없음'
            }에서 가장 높습니다. 익숙한 아이템을 하나 더 사기 전에 이 신호를 먼저 보세요.`,
          },
          actions: {
            eyebrow: '작업',
            import: '캔버스 열기',
            build: '마네킹 피팅 열기',
          },
          searchPlaceholder: '옷장 아이템 검색',
          allCategories: '전체 카테고리',
          loading: '옷장을 불러오는 중...',
          emptyAll: '아직 옷장 아이템이 없습니다. 캔버스에서 링크나 업로드를 가져와 옷장을 먼저 채워주세요.',
          emptyFiltered: '현재 필터에 맞는 아이템이 없습니다. 다른 카테고리나 검색어를 시도하세요.',
          deleteFailed: '에셋을 삭제할 수 없습니다.',
        }
      : {
          eyebrow: 'Closet',
          title: 'Organize the wardrobe, then jump straight into mannequin fitting',
          description: 'This is the wardrobe home base: review what is saved, clean up duplicates, and open a custom mannequin fitting flow from any piece you keep.',
          info: ['Items tracked', 'Duplicate risk', 'Season gaps', 'Most common'],
          none: 'None',
          health: {
            eyebrow: 'Closet health',
            missingTitle: `You still need ${closetSummary.missing
              .slice(0, 2)
              .map((entry) => getClosetCategoryLabel(entry, language).toLowerCase())
              .join(' and ')} to make the closet more flexible.`,
            readyTitle: 'The closet covers the core categories. The next gains are about reducing repetition and increasing reuse.',
            body: `Duplicate pressure is currently highest in ${
              closetSummary.duplicateRisk.length > 0
                ? closetSummary.duplicateRisk.map((entry) => getClosetCategoryLabel(entry, language).toLowerCase()).join(', ')
                : 'no obvious category'
            }. Use that signal before you buy another familiar piece.`,
          },
          actions: {
            eyebrow: 'Actions',
            import: 'Open canvas',
            build: 'Open mannequin fitting',
          },
          searchPlaceholder: 'Search closet pieces',
          allCategories: 'All categories',
          loading: 'Loading closet...',
          emptyAll: 'No closet items yet. Import links or uploads from the canvas first so the wardrobe has something to fit.',
          emptyFiltered: 'No pieces match the current filter. Try another category or search term.',
          deleteFailed: 'Failed to delete asset.',
        };

  const categories = useMemo(
    () => ['all', ...new Set(assets.map((asset) => asset.category))],
    [assets]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false;
      if (!normalizedQuery) return true;
      return asset.name.toLowerCase().includes(normalizedQuery);
    });
  }, [assets, category, deferredQuery]);

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset(id);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : copy.deleteFailed;
      alert(message);
    }
  };

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    >
      <InfoStrip
        items={[
          { label: copy.info[0], value: String(assets.length) },
          { label: copy.info[1], value: String(closetSummary.duplicateRisk.length) },
          { label: copy.info[2], value: String(closetSummary.missing.length) },
          {
            label: copy.info[3],
            value: closetSummary.mostCommon ? getClosetCategoryLabel(closetSummary.mostCommon, language) : copy.none,
          },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.health.eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-black">
            {closetSummary.missing.length > 0
              ? copy.health.missingTitle
              : copy.health.readyTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58">{copy.health.body}</p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{copy.actions.eyebrow}</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/studio">
              {copy.actions.import} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {fittingAssetId ? (
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
              <Link href={`/app/closet/item/${fittingAssetId}`}>{copy.actions.build}</Link>
            </Button>
          ) : (
            <Button disabled variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white/50">
              {copy.actions.build}
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/25"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/25 md:max-w-[220px]"
        >
          {categories.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'all' ? copy.allCategories : getClosetCategoryLabel(entry, language)}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <section className="border border-red-500/20 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="border border-black/8 bg-white px-5 py-10 text-sm text-black/40">
          {copy.loading}
        </section>
      ) : filteredAssets.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              categoryLabel={getClosetCategoryLabel(asset.category, language)}
              onDelete={handleDeleteAsset}
            />
          ))}
        </section>
      ) : (
        <section className="border border-dashed border-black/20 px-5 py-10">
          <p className="max-w-xl text-sm leading-7 text-black/58">
            {assets.length === 0
              ? copy.emptyAll
              : copy.emptyFiltered}
          </p>
        </section>
      )}
    </AppPageFrame>
  );
}

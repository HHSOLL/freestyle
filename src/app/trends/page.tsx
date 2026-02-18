'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { INITIAL_TRENDS } from '@/features/trends/constants';
import { TrendGrid } from '@/features/trends/components/TrendGrid';
import { TrendModal } from '@/features/trends/components/TrendModal';
import type { TrendGender, TrendItem, TrendSeason, TrendStyle } from '@/features/trends/types';

type SortMode = 'popular' | 'latest';
type CategoryFilter = 'all';

const genderFilters: Array<{ value: TrendGender | CategoryFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'trends.filter.all' },
  { value: 'men', labelKey: 'trends.filter.gender.men' },
  { value: 'women', labelKey: 'trends.filter.gender.women' },
];

const seasonFilters: Array<{ value: TrendSeason | CategoryFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'trends.filter.all' },
  { value: 'spring', labelKey: 'trends.filter.season.spring' },
  { value: 'summer', labelKey: 'trends.filter.season.summer' },
  { value: 'fall', labelKey: 'trends.filter.season.fall' },
  { value: 'winter', labelKey: 'trends.filter.season.winter' },
];

const styleFilters: Array<{ value: TrendStyle | CategoryFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'trends.filter.all' },
  { value: 'street', labelKey: 'trends.filter.style.street' },
  { value: 'formal', labelKey: 'trends.filter.style.formal' },
  { value: 'dandy', labelKey: 'trends.filter.style.dandy' },
];

export default function TrendsPage() {
  const { t } = useLanguage();
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [items, setItems] = useState<TrendItem[]>(INITIAL_TRENDS);
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [selectedGender, setSelectedGender] = useState<TrendGender | CategoryFilter>('all');
  const [selectedSeason, setSelectedSeason] = useState<TrendSeason | CategoryFilter>('all');
  const [selectedStyle, setSelectedStyle] = useState<TrendStyle | CategoryFilter>('all');

  const loadMore = useCallback(() => {
    if (loading) return;
    setLoading(true);

    setTimeout(() => {
      setItems((prev) => {
        const moreItems = INITIAL_TRENDS.map((item, index) => ({
          ...item,
          id: prev.length + index + 1 + Math.floor(Math.random() * 10000),
          createdAt: Date.now() + index,
        }));
        return [...prev, ...moreItems];
      });
      setLoading(false);
    }, 800);
  }, [loading]);

  const filteredAndSortedItems = useMemo(() => {
    const nextItems = [...items];

    const filteredItems = nextItems.filter((item) => {
      const genderMatch = selectedGender === 'all' || item.gender === selectedGender;
      const seasonMatch = selectedSeason === 'all' || item.season === selectedSeason;
      const styleMatch = selectedStyle === 'all' || item.style === selectedStyle;
      return genderMatch && seasonMatch && styleMatch;
    });

    filteredItems.sort((a, b) => {
      if (sortMode === 'latest') {
        return (b.createdAt ?? b.id) - (a.createdAt ?? a.id);
      }
      const popularityGap = (b.popularity ?? 0) - (a.popularity ?? 0);
      if (popularityGap !== 0) {
        return popularityGap;
      }
      return (b.createdAt ?? b.id) - (a.createdAt ?? a.id);
    });

    return filteredItems;
  }, [items, selectedGender, selectedSeason, selectedStyle, sortMode]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-5 border-b border-black/5 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <button
              type="button"
              onClick={() => setSortMode('popular')}
              className={`px-5 py-2 rounded-full border text-[11px] font-bold tracking-widest uppercase transition-colors ${
                sortMode === 'popular'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black/50 border-black/10 hover:text-black'
              }`}
            >
              {t('trends.sort.popular')}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('latest')}
              className={`px-5 py-2 rounded-full border text-[11px] font-bold tracking-widest uppercase transition-colors ${
                sortMode === 'latest'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black/50 border-black/10 hover:text-black'
              }`}
            >
              {t('trends.sort.latest')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-black/40">
              {t('trends.filter.gender')}
            </span>
            {genderFilters.map((filter) => {
              const isActive = selectedGender === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedGender(filter.value)}
                  className={`px-4 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black/50 border-black/10 hover:text-black'
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-black/40">
              {t('trends.filter.season')}
            </span>
            {seasonFilters.map((filter) => {
              const isActive = selectedSeason === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedSeason(filter.value)}
                  className={`px-4 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black/50 border-black/10 hover:text-black'
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-black/40">
              {t('trends.filter.style')}
            </span>
            {styleFilters.map((filter) => {
              const isActive = selectedStyle === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedStyle(filter.value)}
                  className={`px-4 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black/50 border-black/10 hover:text-black'
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <TrendGrid t={t} items={filteredAndSortedItems} onSelectTrend={setSelectedTrend} />

        {filteredAndSortedItems.length === 0 && (
          <div className="py-20 text-center text-sm text-black/40">{t('trends.filter.empty')}</div>
        )}

        {loading && (
          <div className="mt-12 text-center text-[10px] font-bold tracking-widest text-black/30 uppercase animate-pulse">
            {t('trends.velocity')}
          </div>
        )}
      </div>

      <TrendModal t={t} selectedTrend={selectedTrend} onClose={() => setSelectedTrend(null)} />
    </div>
  );
}

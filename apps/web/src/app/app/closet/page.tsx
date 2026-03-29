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

export default function ClosetPage() {
  const { assets, loading, error, deleteAsset } = useWardrobeSnapshot();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const deferredQuery = useDeferredValue(query);
  const closetSummary = useMemo(() => summarizeCloset(assets), [assets]);

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
      const message = nextError instanceof Error ? nextError.message : 'Failed to delete asset.';
      alert(message);
    }
  };

  return (
    <AppPageFrame
      eyebrow="Closet"
      title="Your wardrobe should behave like an organized system"
      description="See what is already owned, where repetition is creeping in, and which missing anchors are still limiting the looks you can build."
    >
      <InfoStrip
        items={[
          { label: 'Items tracked', value: String(assets.length) },
          { label: 'Duplicate risk', value: String(closetSummary.duplicateRisk.length) },
          { label: 'Season gaps', value: String(closetSummary.missing.length) },
          { label: 'Most common', value: closetSummary.mostCommon ? getClosetCategoryLabel(closetSummary.mostCommon) : 'None' },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Closet health</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-black">
            {closetSummary.missing.length > 0
              ? `You still need ${closetSummary.missing
                  .slice(0, 2)
                  .map((entry) => getClosetCategoryLabel(entry).toLowerCase())
                  .join(' and ')} to make the closet more flexible.`
              : 'The closet covers the core categories. The next gains are about reducing repetition and increasing reuse.'}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58">
            Duplicate pressure is currently highest in{' '}
            {closetSummary.duplicateRisk.length > 0
              ? closetSummary.duplicateRisk.map((entry) => getClosetCategoryLabel(entry).toLowerCase()).join(', ')
              : 'no obvious category'}
            . Use that signal before you buy another familiar piece.
          </p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Actions</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/studio">
              Import in workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/app/looks/new">Build a look</Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search closet pieces"
          className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/25"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/25 md:max-w-[220px]"
        >
          {categories.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'all' ? 'All categories' : getClosetCategoryLabel(entry)}
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
          Loading closet...
        </section>
      ) : filteredAssets.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              categoryLabel={getClosetCategoryLabel(asset.category)}
              onDelete={handleDeleteAsset}
            />
          ))}
        </section>
      ) : (
        <section className="border border-dashed border-black/20 px-5 py-10">
          <p className="max-w-xl text-sm leading-7 text-black/58">
            {assets.length === 0
              ? 'No closet items yet. Import links or uploads from the workspace to start building your wardrobe system.'
              : 'No pieces match the current filter. Try another category or search term.'}
          </p>
        </section>
      )}
    </AppPageFrame>
  );
}

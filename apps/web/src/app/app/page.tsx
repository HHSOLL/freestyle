'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { INITIAL_TRENDS } from '@/features/trends/constants';
import {
  getClosetCategoryLabel,
  summarizeCloset,
} from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';

export default function AppHomePage() {
  const { looks, assets, loading, error } = useWardrobeSnapshot();
  const closetSummary = summarizeCloset(assets);
  const featuredLooks = looks.slice(0, 2);
  const latestAssets = assets.slice(0, 4);
  const mostCommonLabel = closetSummary.mostCommon
    ? getClosetCategoryLabel(closetSummary.mostCommon)
    : 'Not enough data yet';

  return (
    <AppPageFrame
      eyebrow="Dashboard"
      title="A command surface for your wardrobe"
      description="Track what you own, turn it into reusable looks, and keep the next decision grounded in the closet you already have."
    >
      <InfoStrip
        items={[
          { label: 'Closet items', value: String(assets.length) },
          { label: 'Saved looks', value: String(looks.length) },
          { label: 'Discover queue', value: String(INITIAL_TRENDS.length) },
          { label: 'Missing anchors', value: String(closetSummary.missing.length) },
        ]}
      />

      {error ? (
        <section className="border border-red-500/20 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5 border border-black/8 bg-white px-5 py-5">
          <div className="flex flex-col gap-4 border-b border-black/8 pb-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Today&apos;s operating view</p>
              <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">The system is only as useful as the loop it closes.</h2>
              <p className="text-sm leading-7 text-black/58">
                Import pieces into the closet, assemble them into looks, and use that structure to decide what deserves attention next.
              </p>
            </div>
            <Button asChild className="rounded-full bg-black px-5 text-white hover:bg-black/90">
              <Link href="/app/looks/new">
                Create a look <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/app/closet" className="border-t border-black/10 pt-4 transition hover:border-black/30">
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Closet</p>
              <p className="mt-2 text-sm leading-7 text-black/58">
                {assets.length > 0
                  ? `${assets.length} pieces tracked. ${closetSummary.missing.length} category gaps still block better combinations.`
                  : 'No tracked pieces yet. Start by importing the wardrobe you already rely on.'}
              </p>
            </Link>
            <Link href="/app/looks" className="border-t border-black/10 pt-4 transition hover:border-black/30">
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Looks</p>
              <p className="mt-2 text-sm leading-7 text-black/58">
                {looks.length > 0
                  ? `${looks.length} looks saved. Your latest recipes are ready to reuse, review, and share.`
                  : 'No saved looks yet. Turn the Studio canvas into a reusable wardrobe recipe.'}
              </p>
            </Link>
            <Link href="/app/decide" className="border-t border-black/10 pt-4 transition hover:border-black/30">
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Decide</p>
              <p className="mt-2 text-sm leading-7 text-black/58">
                {closetSummary.duplicateRisk.length > 0
                  ? `${closetSummary.duplicateRisk.length} categories already look crowded. Buy against gaps, not reflexes.`
                  : 'Your closet still needs more structure before duplicate risk becomes a real constraint.'}
              </p>
            </Link>
          </div>
        </div>

        <div className="border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Wardrobe status</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em]">Your current closet leans toward {mostCommonLabel.toLowerCase()}.</h2>
          <p className="mt-4 text-sm leading-7 text-white/68">
            {closetSummary.missing.length > 0
              ? `The biggest unlock right now is filling ${closetSummary.missing
                  .slice(0, 2)
                  .map((category) => getClosetCategoryLabel(category).toLowerCase())
                  .join(' and ')}.`
              : 'You have a base across the core categories. The next gains will come from stronger look reuse and better decision hygiene.'}
          </p>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm text-white/72">
            <p>Duplicate pressure: {closetSummary.duplicateRisk.length > 0 ? closetSummary.duplicateRisk.map(getClosetCategoryLabel).join(', ') : 'Low'}</p>
            <p>Recent inspiration waiting: {INITIAL_TRENDS.length}</p>
            <p>Latest saved look: {looks[0]?.title ?? 'None yet'}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Recent looks</p>
              <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">Saved recipes should stay close at hand.</h2>
            </div>
            <Link href="/app/looks" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56 transition hover:text-black">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="border border-black/8 bg-white px-5 py-10 text-sm text-black/40">Loading wardrobe snapshot...</div>
          ) : featuredLooks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {featuredLooks.map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/20 px-5 py-10">
              <p className="max-w-xl text-sm leading-7 text-black/58">
                No looks saved yet. Use the workspace to turn your current pieces into repeatable outfits instead of one-off screenshots.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Closet preview</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">The next decision should start from what is already here.</h2>
          </div>
          <div className="border border-black/8 bg-white">
            {latestAssets.length > 0 ? (
              latestAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between gap-4 border-b border-black/8 px-5 py-4 last:border-b-0">
                  <div>
                    <p className="font-semibold text-black">{asset.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-black/38">
                      {getClosetCategoryLabel(asset.category)} · {asset.source}
                    </p>
                  </div>
                  <Link href={`/app/closet/item/${asset.id}`} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56 transition hover:text-black">
                    Open
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-sm leading-7 text-black/58">
                No closet items yet. Import from a link, a cart, or an upload to start building the wardrobe graph.
              </div>
            )}
          </div>
        </div>
      </section>
    </AppPageFrame>
  );
}

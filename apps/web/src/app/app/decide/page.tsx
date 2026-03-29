'use client';

import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import {
  getClosetCategoryLabel,
  summarizeCloset,
} from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';

export default function DecidePage() {
  const { looks, assets } = useWardrobeSnapshot();
  const closetSummary = summarizeCloset(assets);
  const buyNext = closetSummary.missing.slice(0, 2);
  const pauseCategories = closetSummary.duplicateRisk.slice(0, 2);

  return (
    <AppPageFrame
      eyebrow="Decide"
      title="Buying becomes a scored decision, not a vague vibe"
      description="Even before dedicated decision jobs arrive, the current wardrobe already tells you where spending will unlock more looks and where it will just add repetition."
    >
      <InfoStrip
        items={[
          { label: 'Closet pieces', value: String(assets.length) },
          { label: 'Saved looks', value: String(looks.length) },
          { label: 'Gap categories', value: String(closetSummary.missing.length) },
          { label: 'Pause categories', value: String(closetSummary.duplicateRisk.length) },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Buy next</p>
          <h2 className="mt-3 font-serif text-2xl tracking-[-0.05em] text-black">
            {buyNext.length > 0 ? buyNext.map(getClosetCategoryLabel).join(' / ') : 'No obvious gap yet'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/58">
            {buyNext.length > 0
              ? 'These categories are underrepresented in the current closet and are the likeliest places to unlock more combinations.'
              : 'Core categories are already covered. Future decisions should lean on nuance, quality, and replacement timing instead of basic coverage.'}
          </p>
        </div>
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Pause on</p>
          <h2 className="mt-3 font-serif text-2xl tracking-[-0.05em] text-black">
            {pauseCategories.length > 0 ? pauseCategories.map(getClosetCategoryLabel).join(' / ') : 'Low duplicate pressure'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/58">
            {pauseCategories.length > 0
              ? 'These categories already show enough depth that another similar purchase is likely to cannibalize attention rather than expand it.'
              : 'No category is obviously overloaded yet. Keep organizing the closet to make future duplicate signals sharper.'}
          </p>
        </div>
        <div className="border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Why this works</p>
          <h2 className="mt-3 font-serif text-2xl tracking-[-0.05em]">A better decision starts from current structure, not raw desire.</h2>
          <p className="mt-3 text-sm leading-7 text-white/68">
            The closer your closet data gets to reality, the more precise unlock score and duplicate warnings become. This surface turns that structure into action.
          </p>
        </div>
      </section>
    </AppPageFrame>
  );
}

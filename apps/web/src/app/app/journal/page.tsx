'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';

export default function JournalPage() {
  const { looks, assets } = useWardrobeSnapshot();

  return (
    <AppPageFrame
      eyebrow="Journal"
      title="The system learns from what you actually wear"
      description="Journal is the memory loop. It turns saved looks and closet structure into future confidence once real wear logs start accumulating."
    >
      <InfoStrip
        items={[
          { label: 'Looks to log', value: String(looks.length) },
          { label: 'Closet pieces', value: String(assets.length) },
          { label: 'Memory loop', value: looks.length > 0 ? 'Primed' : 'Waiting' },
          { label: 'Next unlock', value: looks.length > 0 ? 'Wear tracking' : 'Save first look' },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">A memory loop only matters when there are real looks to learn from.</h2>
          <p className="mt-4 text-sm leading-7 text-black/58">
            Right now this surface is preparing for wear logs, satisfaction notes, and weekly summaries. The stronger the looks layer becomes, the more useful this page will be when the journal backend lands.
          </p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Next steps</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/app/looks">Review saved looks</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/app/profile">Sync account</Link>
          </Button>
        </div>
      </section>
    </AppPageFrame>
  );
}

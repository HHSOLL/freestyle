'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';

export default function LooksPage() {
  const { looks, assets, loading, error, deleteLook } = useWardrobeSnapshot();

  const handleCopyShare = async (shareSlug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${shareSlug}`);
    } catch {
      alert('Failed to copy the share link.');
    }
  };

  const handleDeleteLook = async (id: string) => {
    try {
      await deleteLook(id);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to delete look.';
      alert(message);
    }
  };

  return (
    <AppPageFrame
      eyebrow="Looks"
      title="Looks are saved recipes, not throwaway screenshots"
      description="Every saved look should come back as a reusable wardrobe asset: easy to revisit, easy to share, and grounded in real pieces from your closet."
    >
      <InfoStrip
        items={[
          { label: 'Saved looks', value: String(looks.length) },
          { label: 'Closet pieces', value: String(assets.length) },
          { label: 'Share ready', value: String(looks.length) },
          { label: 'Latest save', value: looks[0] ? new Date(looks[0].createdAt).toLocaleDateString() : 'None' },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Workflow</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-black">Compose in the workspace, then return here to reuse or share.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58">
            The saved looks layer turns Studio from a one-off tool into a memory surface. Your latest outfit recipes should stay readable, copyable, and ready for future decisions.
          </p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Create</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/app/looks/new">Open workspace</Link>
          </Button>
          <p className="text-sm leading-7 text-white/68">
            New looks still use the proven Studio canvas, but the saved output now flows back into the wardrobe system.
          </p>
        </div>
      </section>

      {error ? (
        <section className="border border-red-500/20 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="border border-black/8 bg-white px-5 py-10 text-sm text-black/40">
          Loading saved looks...
        </section>
      ) : looks.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {looks.map((look) => (
            <LookCard
              key={look.id}
              look={look}
              onCopyShare={handleCopyShare}
              onDelete={handleDeleteLook}
            />
          ))}
        </section>
      ) : (
        <section className="border border-dashed border-black/20 px-5 py-10">
          <p className="max-w-xl text-sm leading-7 text-black/58">
            No looks saved yet. Build one in the workspace, then return here to manage reusable outfit recipes instead of one-off exports.
          </p>
        </section>
      )}
    </AppPageFrame>
  );
}

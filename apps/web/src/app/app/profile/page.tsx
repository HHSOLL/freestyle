'use client';

import Link from 'next/link';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { getClosetCategoryLabel } from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useAuth } from '@/lib/AuthContext';

export default function AppProfilePage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const { looks, assets, loading } = useWardrobeSnapshot();

  if (isAuthLoading) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  if (!user) {
    return (
      <AuthGate
        title="Sign in to keep your wardrobe synced"
        description="Closet history, saved looks, and future wear memory become much more useful once they follow the same account across devices."
        nextPath="/app/profile"
      />
    );
  }

  return (
    <AppPageFrame
      eyebrow="Profile"
      title="Account context, saved work, and wardrobe ownership"
      description="This is the account layer for the renewed product: where identity, saved looks, and the long-term wardrobe loop stay anchored."
    >
      <InfoStrip
        items={[
          { label: 'Signed in as', value: user.email?.split('@')[0] ?? 'Member' },
          { label: 'Saved looks', value: String(looks.length) },
          { label: 'Closet items', value: String(assets.length) },
          { label: 'Status', value: loading ? 'Syncing' : 'Ready' },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Account</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-black">{user.email ?? 'FreeStyle member'}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58">
            This account is now the canonical entry point for the wardrobe system. Saved looks, closet pieces, and future journal memory all converge here instead of being split across legacy profile routes.
          </p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Quick actions</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/app/closet">Open closet</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/app/looks">Open looks</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/app/looks/new">Create a new look</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Recent looks</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">Saved work should be visible without digging.</h2>
          </div>
          {looks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {looks.slice(0, 2).map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/20 px-5 py-10 text-sm leading-7 text-black/58">
              No saved looks yet. Build one in the workspace so the profile has something worth remembering.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">Closet snapshot</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">Recent pieces and categories stay attached to the same identity.</h2>
          </div>
          <div className="border border-black/8 bg-white">
            {assets.slice(0, 4).map((asset) => (
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
            ))}
            {assets.length === 0 ? (
              <div className="px-5 py-10 text-sm leading-7 text-black/58">
                No closet items are attached to this account yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppPageFrame>
  );
}

'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { AppShellFrame } from '@/components/layout/AppShellFrame';
import { UnifiedTopbar } from '@/components/layout/UnifiedTopbar';

const isAppPath = (pathname: string) =>
  pathname === '/app' || pathname.startsWith('/app/') || pathname === '/studio' || pathname.startsWith('/studio/');
const isImmersiveClosetPath = (pathname: string) =>
  pathname === '/app/closet' || pathname.startsWith('/app/closet/item/');

const marketingPaths = new Set(['/', '/examples', '/how-it-works']);

const isMarketingPath = (pathname: string) => marketingPaths.has(pathname);

const isSystemPath = (pathname: string) => pathname === '/auth/callback';

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isSystemPath(pathname)) {
    return <>{children}</>;
  }

  if (isImmersiveClosetPath(pathname)) {
    return (
      <div className="min-h-screen bg-[#c8ccd4]">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  if (isAppPath(pathname)) {
    return <AppShellFrame>{children}</AppShellFrame>;
  }

  if (isMarketingPath(pathname)) {
    return (
      <div className="shell-marketing-backdrop min-h-screen pt-[88px] text-foreground sm:pt-[92px]">
        <MarketingHeader />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="shell-neutral-backdrop min-h-screen pt-[88px] sm:pt-[92px]">
      <UnifiedTopbar />
      <main className="min-h-[calc(100svh-88px)] pb-10 sm:min-h-[calc(100svh-92px)] sm:pb-12">{children}</main>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header as LegacyHeader } from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { AppShellFrame } from '@/components/layout/AppShellFrame';

const isAppPath = (pathname: string) => pathname === '/app' || pathname.startsWith('/app/');

const isMarketingPath = (pathname: string) =>
  pathname === '/' || pathname === '/how-it-works' || pathname === '/examples';

const isSystemPath = (pathname: string) => pathname === '/auth/callback';

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isSystemPath(pathname)) {
    return <>{children}</>;
  }

  if (isAppPath(pathname)) {
    return <AppShellFrame>{children}</AppShellFrame>;
  }

  if (isMarketingPath(pathname)) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7f2e8_0%,#f5efe3_18%,#ffffff_46%,#f5f1e8_100%)] text-foreground">
        <MarketingHeader />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <>
      <LegacyHeader />
      <main className="min-h-screen pt-16 pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </>
  );
}

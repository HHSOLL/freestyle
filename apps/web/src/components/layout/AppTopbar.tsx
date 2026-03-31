'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { appChromeCopy, appMeta, appNav } from '@/features/renewal-app/content';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { Sparkles } from 'lucide-react';

const resolveAppMeta = (pathname: string) => {
  if (pathname.startsWith('/app/closet')) return appMeta['/app/closet'];
  if (pathname.startsWith('/studio')) return appMeta['/studio'];
  if (pathname.startsWith('/app/discover')) return appMeta['/app/discover'];
  if (pathname.startsWith('/app/profile')) return appMeta['/app/profile'];
  return appMeta['/app'];
};

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  if (href === '/studio') return pathname === '/studio' || pathname.startsWith('/studio/');
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AppTopbar() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const chromeCopy = appChromeCopy[language];

  const meta = resolveAppMeta(pathname);
  const title = meta.title[language];
  const description = meta.description[language];
  const signInHref = `/app/profile?next=${encodeURIComponent(pathname)}`;
  const navItems = appNav[language];

  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-[rgba(255,255,255,0.82)] backdrop-blur-xl">
      <div className="px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="inline-flex shrink-0 items-center hover:opacity-90" aria-label="FreeStyle home">
              <BrandLogo priority />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/38">{chromeCopy.brand}</p>
              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h2 className="truncate font-serif text-xl tracking-[-0.04em] text-black sm:text-2xl">{title}</h2>
                <span className="hidden items-center gap-1 rounded-full border border-black/8 bg-[#f6f2ea] px-2 py-1 text-[11px] text-black/45 lg:inline-flex">
                  <Sparkles className="h-3.5 w-3.5" />
                  {chromeCopy.liveData}
                </span>
              </div>
              <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-black/56 md:block">{description}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center rounded-full border border-black/8 bg-[#f6f2ea] p-1 sm:flex">
              <button
                type="button"
                onClick={() => setLanguage('ko')}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                  language === 'ko' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                KR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                  language === 'en' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                EN
              </button>
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  signOut().catch((error) => {
                    const message = error instanceof Error ? error.message : chromeCopy.signOutFailed;
                    alert(message);
                  });
                }}
                className="rounded-full border border-black/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black/25 hover:text-black"
              >
                {user.email?.split('@')[0] || chromeCopy.accountFallback}
              </button>
            ) : (
              <Button asChild className="rounded-full bg-black px-4 text-white hover:bg-black/90">
                <Link href={signInHref}>{chromeCopy.signIn}</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white/72 text-black/56 hover:border-black/24 hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

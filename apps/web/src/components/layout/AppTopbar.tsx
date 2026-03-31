'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { appChromeCopy, appMeta } from '@/features/renewal-app/content';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const resolveAppMeta = (pathname: string) => {
  if (pathname.startsWith('/app/closet')) return appMeta['/app/closet'];
  if (pathname.startsWith('/studio')) return appMeta['/studio'];
  if (pathname.startsWith('/app/discover')) return appMeta['/app/discover'];
  if (pathname.startsWith('/app/profile')) return appMeta['/app/profile'];
  return appMeta['/app'];
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

  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-[rgba(255,255,255,0.82)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/38">{chromeCopy.brand}</p>
          <div className="mt-1 flex min-w-0 items-center gap-3">
            <h2 className="truncate font-serif text-2xl tracking-[-0.04em] text-black sm:text-3xl">{title}</h2>
            <span className="hidden items-center gap-1 border border-black/8 px-2 py-1 text-[11px] text-black/45 sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              {chromeCopy.liveData}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/56">{description}</p>
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
          <Button asChild variant="outline" className="hidden rounded-full sm:inline-flex">
            <Link href="/studio">
              {chromeCopy.openWorkspace} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
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
    </header>
  );
}

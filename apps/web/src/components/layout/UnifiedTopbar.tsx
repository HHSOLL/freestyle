'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { appNav } from '@/features/renewal-app/content';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

const navItems = {
  ko: appNav.ko.filter((item) => item.href !== '/'),
  en: appNav.en.filter((item) => item.href !== '/'),
} as const;

const isActivePath = (pathname: string, href: string) => {
  if (href === '/studio') return pathname === '/studio' || pathname.startsWith('/studio/');
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function UnifiedTopbar() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const signInHref = `/app/profile?next=${encodeURIComponent(pathname)}`;
  const signOutLabel = language === 'ko' ? '로그아웃' : 'Sign out';
  const signOutFailed = language === 'ko' ? '로그아웃할 수 없습니다.' : 'Failed to sign out.';

  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto grid h-[88px] max-w-[1720px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 sm:h-[92px] sm:gap-6 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex shrink-0 items-center hover:opacity-90" aria-label="FreeStyle home">
          <BrandLogo priority className="block shrink-0" />
        </Link>

        <nav className="flex min-w-0 items-center justify-center gap-5 overflow-x-auto whitespace-nowrap px-1 text-[13px] font-semibold tracking-[-0.02em] text-black/46 [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-8 sm:text-[15px] lg:gap-14 [&::-webkit-scrollbar]:hidden">
          {navItems[language].map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-3 py-2 transition ${
                  active ? 'glass-pill text-black shadow-[0_12px_30px_-24px_rgba(74,54,23,0.5)]' : 'hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <div className="glass-pill p-1">
            <button
              type="button"
              onClick={() => setLanguage('ko')}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition sm:px-4 sm:py-1.5 ${
                language === 'ko' ? 'bg-black text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)]' : 'text-black/42 hover:text-black'
              }`}
            >
              KR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition sm:px-4 sm:py-1.5 ${
                language === 'en' ? 'bg-black text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)]' : 'text-black/42 hover:text-black'
              }`}
            >
              EN
            </button>
          </div>

          {user ? (
            <>
              <Button asChild className="h-11 rounded-full bg-black px-4 text-white hover:bg-black/90 sm:h-12 sm:px-5">
                <Link href="/app/profile">{language === 'ko' ? '마이페이지' : 'My Page'}</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-black/14 bg-white/74 px-4 text-black/70 backdrop-blur-sm hover:bg-white hover:text-black sm:h-12 sm:px-5"
                onClick={() => {
                  signOut().catch((error) => {
                    const message = error instanceof Error ? error.message : signOutFailed;
                    alert(message);
                  });
                }}
              >
                {signOutLabel}
              </Button>
            </>
          ) : (
            <Button asChild className="h-11 rounded-full bg-black px-4 text-white hover:bg-black/90 sm:h-12 sm:px-5">
              <Link href={signInHref}>{language === 'ko' ? '로그인' : 'Login'}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

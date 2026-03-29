'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { marketingCopy } from '@/features/renewal-marketing/content';
import { useLanguage } from '@/lib/LanguageContext';

export function MarketingHeader() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const copy = marketingCopy[language];

  const links = [
    { href: '/how-it-works', label: copy.nav.product },
    { href: '/examples', label: copy.nav.examples },
    { href: '/app', label: copy.nav.app },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-[rgba(247,242,232,0.8)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center hover:opacity-90" aria-label="FreeStyle home">
          <BrandLogo priority />
        </Link>

        <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/46 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'text-black' : 'transition hover:text-black'}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-black/8 bg-white/70 p-1">
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
          <Button asChild className="rounded-full bg-black px-5 text-white hover:bg-black/90">
            <Link href="/app">{copy.nav.cta}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

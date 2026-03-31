'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { marketingCopy } from '@/features/renewal-marketing/content';
import { useLanguage } from '@/lib/LanguageContext';

export function MarketingFooter() {
  const { language } = useLanguage();
  const copy = marketingCopy[language].footer;
  const primaryLinks = [
    { href: '/app/closet', label: language === 'ko' ? '옷장' : 'Closet' },
    { href: '/studio', label: language === 'ko' ? '캔버스' : 'Canvas' },
    { href: '/app/discover', label: language === 'ko' ? '발견' : 'Discover' },
    { href: '/app/profile', label: language === 'ko' ? '마이페이지' : 'My Page' },
  ];

  return (
    <footer className="border-t border-black/8 bg-[#f3ede1]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-[1.2fr_1fr] sm:px-8">
        <div className="space-y-4">
          <BrandLogo />
          <p className="max-w-sm text-sm leading-7 text-black/56">
            {copy.body}
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/35">{copy.pathsLabel}</p>
          <div className="space-y-2 text-sm text-black/62">
            {primaryLinks.map((link) => (
              <Link key={link.href} className="block hover:text-black" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

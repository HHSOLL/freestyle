'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { appNav } from '@/features/renewal-app/content';
import { useLanguage } from '@/lib/LanguageContext';
import { BookOpen, Compass, House, LayoutGrid, Library, Shirt, User } from 'lucide-react';

const iconMap = {
  '/app': House,
  '/app/closet': Shirt,
  '/app/looks': LayoutGrid,
  '/app/discover': Compass,
  '/app/decide': Library,
  '/app/journal': BookOpen,
  '/app/profile': User,
} as const;

type AppSidebarProps = {
  mobile?: boolean;
};

export function AppSidebar({ mobile = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const items = appNav[language];

  const containerClass = mobile
    ? 'fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-black/8 bg-[rgba(247,244,238,0.96)] px-2 backdrop-blur-xl md:hidden'
    : 'hidden w-[236px] shrink-0 border-r border-black/8 bg-[#f7f4ee] px-5 py-6 md:flex md:flex-col';

  return (
    <aside className={containerClass}>
      {!mobile ? (
        <>
          <Link href="/app" className="inline-flex items-center" aria-label="FreeStyle app home">
            <BrandLogo variant="mark" />
            <span className="ml-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-black/52">Wardrobe OS</span>
          </Link>
          <nav className="mt-10 space-y-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = iconMap[item.href as keyof typeof iconMap] ?? House;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 text-sm transition ${
                    active ? 'bg-black text-white' : 'text-black/58 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-black/8 pt-5 text-xs leading-6 text-black/44">
            Wardrobe OS preview is live.
            <br />
            Import, compose, decide, and remember from one shell.
          </div>
        </>
      ) : (
        items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = iconMap[item.href as keyof typeof iconMap] ?? House;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] transition ${
                active ? 'text-black' : 'text-black/30'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })
      )}
    </aside>
  );
}

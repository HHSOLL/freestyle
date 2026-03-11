'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Flame, User } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t('nav.home'), icon: Home },
    { href: "/studio", label: t('nav.studio'), icon: LayoutGrid },
    { href: "/trends", label: t('nav.trends'), icon: Flame },
    { href: "/profile", label: t('nav.profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/80 backdrop-blur-xl border-t border-black/5 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${
                isActive ? "text-black scale-105" : "text-black/30 hover:text-black/60"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
              <span className="text-[9px] font-bold uppercase tracking-tight truncate w-full text-center">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

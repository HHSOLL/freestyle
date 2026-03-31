'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, PenSquare, Shirt, User } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function MobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const navItems = [
    { href: "/app/closet", label: language === 'ko' ? '옷장' : 'Closet', icon: Shirt },
    { href: "/studio", label: language === 'ko' ? '캔버스' : 'Canvas', icon: PenSquare },
    { href: "/app/discover", label: language === 'ko' ? '발견' : 'Discover', icon: Compass },
    { href: "/app/profile", label: language === 'ko' ? '마이페이지' : 'My Page', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/80 backdrop-blur-xl border-t border-black/5 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

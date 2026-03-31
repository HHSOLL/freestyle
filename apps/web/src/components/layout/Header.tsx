'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, PenSquare, Shirt, UserRound } from "lucide-react";
import { appChromeCopy } from "@/features/renewal-app/content";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage } = useLanguage();
    const { user, signOut } = useAuth();
    const chromeCopy = appChromeCopy[language];
    const signInHref = `/app/profile?next=${encodeURIComponent(pathname)}`;

    const navLinks = [
        { href: "/app/closet", label: language === 'ko' ? '옷장' : 'Closet', icon: Shirt },
        { href: "/studio", label: language === 'ko' ? '캔버스' : 'Canvas', icon: PenSquare },
        { href: "/app/discover", label: language === 'ko' ? '발견' : 'Discover', icon: Compass },
        { href: "/app/profile", label: language === 'ko' ? '마이페이지' : 'My Page', icon: UserRound },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md transition-all border-b border-black/5">
            {/* Logo */}
            <div className="flex-1">
                <Link href="/" className="inline-flex items-center hover:opacity-90" aria-label="FreeStyle home">
                    <BrandLogo priority />
                </Link>
            </div>

            {/* Desktop Nav: Hidden on Mobile */}
            <nav className="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/80">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`inline-flex items-center gap-2 ${isActive ? "text-foreground border-b-2 border-black pb-1" : "hover:text-foreground"} transition-all`}
                        >
                            <Icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Actions */}
            <div className="flex-1 flex justify-end items-center gap-2">
                <div className="flex items-center bg-black/5 rounded-full p-1 mr-2">
                    <button
                        onClick={() => setLanguage('ko')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${language === 'ko' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'}`}
                    >
                        KR
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${language === 'en' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'}`}
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
                        className="ml-2 rounded-full border border-black/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65 transition hover:border-black/25 hover:text-black"
                    >
                        {user.email?.split("@")[0] || chromeCopy.accountFallback}
                    </button>
                ) : (
                    <Link
                        href={signInHref}
                        className="ml-2 rounded-full border border-black/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65 transition hover:border-black/25 hover:text-black"
                    >
                        {chromeCopy.signIn}
                    </Link>
                )}
            </div>
        </header>
    );
}

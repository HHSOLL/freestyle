'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Header() {
    const pathname = usePathname();
    const { language, setLanguage, t } = useLanguage();
    const { user, signOut } = useAuth();

    const navLinks = [
        { href: "/studio", label: t('nav.studio') },
        { href: "/trends", label: t('nav.trends') },
        { href: "/profile", label: t('nav.profile') },
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
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${isActive ? "text-foreground border-b-2 border-black pb-1" : "hover:text-foreground"} transition-all`}
                        >
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

                <Button variant="ghost" size="icon" className="hover:bg-transparent text-foreground/70 hover:text-foreground">
                    <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="relative hover:bg-transparent text-foreground/70 hover:text-foreground">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>
                {user ? (
                    <button
                        type="button"
                        onClick={() => {
                            signOut().catch((error) => {
                                const message = error instanceof Error ? error.message : "Failed to sign out.";
                                alert(message);
                            });
                        }}
                        className="ml-2 rounded-full border border-black/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65 transition hover:border-black/25 hover:text-black"
                    >
                        {user.email?.split("@")[0] || "Account"}
                    </button>
                ) : (
                    <Link
                        href="/studio"
                        className="ml-2 rounded-full border border-black/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65 transition hover:border-black/25 hover:text-black"
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </header>
    );
}

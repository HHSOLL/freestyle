"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { wardrobeThemeStyle, wardrobeTokens } from "@freestyle/design-tokens";
import { cn } from "@freestyle/shared-utils";
import { PillButton, SurfacePanel } from "@freestyle/ui";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { localizedNavigation, resolveSurfaceFromPath } from "@/lib/product-routes";

export function ProductAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeSurface = resolveSurfaceFromPath(pathname);
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigation = localizedNavigation(language);

  return (
    <div
      className="min-h-screen text-[var(--fs-text)]"
      style={{
        ...wardrobeThemeStyle,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(255,255,255,0) 26%), linear-gradient(180deg, #e7ebf0 0%, #d9dde2 30%, #d0d6dc 100%)",
      }}
    >
      <div className="pointer-events-none fixed left-4 top-4 z-50 sm:left-6 sm:top-5 lg:left-8">
        <Link href="/app/closet" className="pointer-events-auto min-w-0 no-underline">
          <SurfacePanel className="rounded-full px-3 py-2">
            <div className="flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold tracking-[0.22em]"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  border: `1px solid ${wardrobeTokens.color.dividerStrong}`,
                }}
              >
                FS
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--fs-text-faint)]">
                  Wardrobe runtime
                </p>
                <p className="truncate text-[13px] font-semibold text-[var(--fs-text)]">Human fitting studio</p>
              </div>
            </div>
          </SurfacePanel>
        </Link>
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-5">
        <SurfacePanel className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-2">
          {navigation.map((item) => {
            const isActive = item.id === activeSurface;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-full px-3 py-2 text-[11px] font-semibold no-underline transition sm:px-4"
                style={{
                  background: isActive ? wardrobeTokens.color.accent : "transparent",
                  color: isActive ? "#ffffff" : wardrobeTokens.color.textMuted,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </SurfacePanel>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-5 lg:right-8">
        <SurfacePanel className="pointer-events-auto hidden items-center gap-1 rounded-full px-1 py-1 sm:flex">
          <PillButton active={language === "ko"} onClick={() => setLanguage("ko")} className="px-3 py-1.5">
            KO
          </PillButton>
          <PillButton active={language === "en"} onClick={() => setLanguage("en")} className="px-3 py-1.5">
            EN
          </PillButton>
        </SurfacePanel>
        <Link href="/app/profile" className="pointer-events-auto no-underline">
          <SurfacePanel className="rounded-full px-3 py-2">
            <div className="flex items-center gap-3">
              <div
                className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: `1px solid ${wardrobeTokens.color.divider}`,
                }}
              >
                {(user?.email?.[0] ?? "G").toUpperCase()}
              </div>
              <div className="hidden text-left lg:block">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--fs-text-faint)]">Profile</div>
                <div className="max-w-[140px] truncate text-[12px] font-semibold text-[var(--fs-text)]">
                  {user?.email ?? (language === "ko" ? "로컬" : "Local")}
                </div>
              </div>
            </div>
          </SurfacePanel>
        </Link>
      </div>

      <main className="px-0 pb-34 pt-24 lg:pt-28">{children}</main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5">
        <SurfacePanel className="pointer-events-auto flex w-full max-w-[620px] items-center justify-between gap-1 rounded-full px-2 py-2">
          {navigation.map((item) => {
            const isActive = item.id === activeSurface;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "inline-flex min-w-[64px] flex-1 items-center justify-center rounded-full px-3 py-2 text-[11px] font-semibold no-underline transition",
                )}
                style={{
                  background: isActive ? wardrobeTokens.color.accent : "transparent",
                  color: isActive ? "#ffffff" : wardrobeTokens.color.textMuted,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </SurfacePanel>
      </div>
    </div>
  );
}

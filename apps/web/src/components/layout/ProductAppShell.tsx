"use client";

import { usePathname } from "next/navigation";
import { wardrobeThemeStyle } from "@freestyle/design-tokens";
import { AppTopBar } from "@/components/layout/AppTopBar";

export function ProductAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeSurface = pathname.startsWith("/app/lab") ? null : undefined;

  return (
    <div
      className="min-h-screen text-[var(--fs-text)]"
      style={{
        ...wardrobeThemeStyle,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(255,255,255,0) 26%), linear-gradient(180deg, #e7ebf0 0%, #d9dde2 30%, #d0d6dc 100%)",
      }}
    >
      <AppTopBar activeSurface={activeSurface} />
      <main className="px-0 pb-0 pt-0">{children}</main>
    </div>
  );
}

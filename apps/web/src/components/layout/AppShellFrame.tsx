'use client';

import type { ReactNode } from 'react';
import { AppTopbar } from '@/components/layout/AppTopbar';

export function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="shell-app-backdrop min-h-screen pt-[88px] text-black sm:pt-[92px]">
      <AppTopbar />
      <main className="min-h-[calc(100svh-88px)] pb-10 sm:min-h-[calc(100svh-92px)] sm:pb-12">{children}</main>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { AppTopbar } from '@/components/layout/AppTopbar';

export function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ee_0%,#ffffff_22%,#f6f2ea_100%)] text-black">
      <AppTopbar />
      <main className="px-5 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppTopbar } from '@/components/layout/AppTopbar';

export function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ee_0%,#ffffff_22%,#f6f2ea_100%)] text-black">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 px-5 py-8 pb-24 sm:px-8 md:pb-8">{children}</main>
        </div>
      </div>
      <AppSidebar mobile />
    </div>
  );
}

import type { ReactNode } from 'react';
import { GlassPanel, ShellEyebrow } from '@/components/layout/ShellPrimitives';
import { cn } from '@/lib/utils';

type AppPageFrameProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AppPageFrame({
  eyebrow,
  title,
  description,
  children,
  badge,
  className,
  contentClassName,
}: AppPageFrameProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12', className)}>
      <div className="space-y-8 sm:space-y-10">
        <GlassPanel as="section" tone="strong" className="overflow-hidden p-6 sm:p-8">
        {eyebrow ? (
            <ShellEyebrow>{eyebrow}</ShellEyebrow>
        ) : null}
          <div className="max-w-3xl space-y-3">
            <h1 className="font-serif text-4xl tracking-[-0.05em] text-black sm:text-5xl lg:text-[3.45rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-black/62 sm:text-base">{description}</p>
          </div>
          {badge ? <div className="mt-5 flex flex-wrap items-center gap-3">{badge}</div> : null}
        </GlassPanel>
        <div className={cn('space-y-8', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}

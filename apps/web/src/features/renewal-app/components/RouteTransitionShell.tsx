'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, LogIn } from 'lucide-react';
import { GlassPanel, GlassPill, ShellEyebrow } from '@/components/layout/ShellPrimitives';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { AppPageFrame } from './AppPageFrame';
import { InfoStrip } from './InfoStrip';

type TransitionMetric = {
  label: string;
  value: string;
};

type TransitionPanel = {
  eyebrow: string;
  title: string;
  body: string;
  tone?: 'default' | 'strong' | 'inverse';
};

type TransitionAction = {
  href: string;
  label: string;
};

type RouteTransitionShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  metrics: TransitionMetric[];
  panels: TransitionPanel[];
  actionIntro: {
    eyebrow: string;
    title: string;
    body: string;
  };
  primaryAction: TransitionAction;
  secondaryAction: TransitionAction;
  signInLabel: string;
};

export function RouteTransitionShell({
  eyebrow,
  title,
  description,
  status,
  metrics,
  panels,
  actionIntro,
  primaryAction,
  secondaryAction,
  signInLabel,
}: RouteTransitionShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const signInHref = `/app/profile?next=${encodeURIComponent(pathname)}`;

  return (
    <AppPageFrame
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={<GlassPill>{status}</GlassPill>}
    >
      <InfoStrip items={metrics} />

      <section className={cn('grid gap-4', panels.length > 1 ? 'lg:grid-cols-2' : undefined)}>
        {panels.map((panel) => (
          <GlassPanel key={`${panel.eyebrow}-${panel.title}`} as="article" tone={panel.tone} className="h-full p-6 sm:p-7">
            <ShellEyebrow>{panel.eyebrow}</ShellEyebrow>
            <h2 className="mt-3 font-serif text-[2rem] tracking-[-0.05em] text-black sm:text-[2.35rem]">
              {panel.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/62 sm:text-[15px]">{panel.body}</p>
          </GlassPanel>
        ))}
      </section>

      <GlassPanel tone="strong" className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <ShellEyebrow>{actionIntro.eyebrow}</ShellEyebrow>
          <h2 className="mt-3 font-serif text-[2rem] tracking-[-0.05em] text-black sm:text-[2.35rem]">
            {actionIntro.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-black/62 sm:text-[15px]">{actionIntro.body}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-[420px] lg:justify-end">
          <Button asChild className="h-12 rounded-full bg-black px-6 text-white hover:bg-black/90">
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-black/10 bg-white/70 px-6 text-black backdrop-blur-sm hover:bg-white hover:text-black"
          >
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>

          {!user ? (
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-black/10 bg-transparent px-6 text-black/76 hover:bg-black/[0.03] hover:text-black"
            >
              <Link href={signInHref}>
                <LogIn className="h-4 w-4" />
                {signInLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </GlassPanel>
    </AppPageFrame>
  );
}

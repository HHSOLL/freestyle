import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type GlassPanelTone = 'default' | 'strong' | 'inverse';
type GlassPanelTag = 'article' | 'div' | 'section';

type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  as?: GlassPanelTag;
  children: ReactNode;
  tone?: GlassPanelTone;
  className?: string;
};

const toneClassName: Record<GlassPanelTone, string> = {
  default: 'glass-panel',
  strong: 'glass-panel glass-panel-strong',
  inverse: 'glass-panel glass-panel-inverse',
};

export function GlassPanel({
  as,
  children,
  tone = 'default',
  className,
  ...props
}: GlassPanelProps) {
  const Component = as ?? 'div';

  return (
    <Component className={cn(toneClassName[tone], className)} {...props}>
      {children}
    </Component>
  );
}

export function GlassPill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('glass-pill', className)}>{children}</span>;
}

export function ShellEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em] text-black/42', className)}>
      {children}
    </p>
  );
}

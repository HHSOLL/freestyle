import type { ReactNode } from 'react';

type AppPageFrameProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AppPageFrame({ eyebrow, title, description, children }: AppPageFrameProps) {
  return (
    <div className="space-y-10">
      <section className="space-y-4 border-b border-black/8 pb-8">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/38">{eyebrow}</p>
        ) : null}
        <div className="max-w-3xl space-y-3">
          <h1 className="font-serif text-4xl tracking-[-0.04em] text-black sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-black/62 sm:text-base">{description}</p>
        </div>
      </section>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

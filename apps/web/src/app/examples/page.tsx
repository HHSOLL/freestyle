'use client';

import { SectionReveal } from '@/components/layout/SectionReveal';

const examples = [
  {
    title: 'Reference to closet',
    body: 'A saved Musinsa look becomes a reconstruction prompt. The system finds what is already available in your closet and what is still missing.',
  },
  {
    title: 'Buy or skip decision',
    body: 'A new jacket is scored by how many new looks it unlocks, how much it duplicates, and which existing pieces it strengthens.',
  },
  {
    title: 'Wear memory loop',
    body: 'An outfit is not just saved. It becomes part of a record: when it was worn, how it felt, and whether it should be repeated.',
  },
];

export default function ExamplesPage() {
  return (
    <div className="px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-12">
        <SectionReveal>
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-black/38">Examples</p>
            <h1 className="font-serif text-5xl tracking-[-0.05em] text-black">Three experiences the renewal is optimized for</h1>
            <p className="text-base leading-8 text-black/60">
              These are not feature cards. They are the product behaviors the new FreeStyle should make feel inevitable.
            </p>
          </div>
        </SectionReveal>

        <div className="grid gap-10 lg:grid-cols-3">
          {examples.map((example, index) => (
            <SectionReveal key={example.title} delay={index * 0.06}>
              <article className="space-y-4 border-t border-black/10 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/34">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{example.title}</h2>
                <p className="text-sm leading-7 text-black/58">{example.body}</p>
              </article>
            </SectionReveal>
          ))}
        </div>
      </div>
    </div>
  );
}

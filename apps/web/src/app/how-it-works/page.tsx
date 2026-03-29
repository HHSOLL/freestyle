'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SectionReveal } from '@/components/layout/SectionReveal';
import { useLanguage } from '@/lib/LanguageContext';

const steps = {
  ko: [
    ['Capture', '링크, 스크린샷, 장바구니, 업로드를 통해 영감과 실제 아이템을 한 시스템 안으로 가져옵니다.'],
    ['Translate', '가져온 레퍼런스를 내 옷장 기준으로 다시 풀어 어떤 아이템이 이미 있고 무엇이 부족한지 보여줍니다.'],
    ['Decide', '새 상품이 조합을 얼마나 열어주는지, 무엇과 겹치는지, 지금 사야 하는지 판단합니다.'],
    ['Remember', '실제 착용과 만족도가 쌓이며 다음 추천과 판단이 더 정교해집니다.'],
  ],
  en: [
    ['Capture', 'Bring inspiration and real inventory into one system through links, screenshots, carts, and uploads.'],
    ['Translate', 'Rebuild references against your actual closet so you can see what already exists and what is missing.'],
    ['Decide', 'Judge every candidate by what it unlocks, what it duplicates, and whether it deserves a place in your wardrobe.'],
    ['Remember', 'As wear history accumulates, the system learns from your real behavior instead of static preference only.'],
  ],
} as const;

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const content = steps[language];

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <SectionReveal>
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-black/38">How It Works</p>
            <h1 className="font-serif text-5xl tracking-[-0.05em] text-black">A wardrobe workflow instead of a one-off AI trick</h1>
            <p className="text-base leading-8 text-black/60">
              The renewal starts by turning FreeStyle into a loop: capture, translate, decide, and remember.
            </p>
          </div>
        </SectionReveal>

        <div className="space-y-8">
          {content.map(([title, body], index) => (
            <SectionReveal key={title} delay={index * 0.05}>
              <div className="grid gap-4 border-t border-black/10 pt-5 md:grid-cols-[120px_260px_1fr]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/34">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{title}</h2>
                <p className="max-w-2xl text-sm leading-7 text-black/58">{body}</p>
              </div>
            </SectionReveal>
          ))}
        </div>

        <SectionReveal>
          <div className="border-t border-black/10 pt-6">
            <Button asChild className="rounded-full bg-black px-6 text-white hover:bg-black/90">
              <Link href="/app">Open the new app scaffold</Link>
            </Button>
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}

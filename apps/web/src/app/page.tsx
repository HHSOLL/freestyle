'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionReveal } from '@/components/layout/SectionReveal';
import { marketingCopy } from '@/features/renewal-marketing/content';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy = marketingCopy[language];

  const images = ['/cody3.jpg', '/cody4.jpg', '/cody5.jpg'];
  const orbitImages = [...images, ...images, ...images];
  const primaryHref = user ? '/app/closet' : '/app/profile?next=%2Fapp%2Fcloset';
  const primaryLabel = user ? (language === 'ko' ? '옷장 열기' : 'Enter closet') : copy.hero.primaryCta;

  return (
    <div className="overflow-hidden">
      <section className="border-b border-black/8 px-5 pb-16 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-end">
          <div className="max-w-2xl space-y-8 py-8 lg:py-20">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/42"
            >
              {copy.hero.eyebrow}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut', delay: 0.08 }}
              className="font-serif text-[3rem] leading-[0.92] tracking-[-0.06em] text-black sm:text-[4.5rem] lg:text-[5.8rem]"
            >
              {copy.hero.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut', delay: 0.14 }}
              className="max-w-xl text-base leading-8 text-black/62 sm:text-lg"
            >
              {copy.hero.body}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut', delay: 0.22 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Button asChild className="h-12 rounded-full bg-black px-6 text-white hover:bg-black/90">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-black/12 bg-white/80 px-6">
                <Link href="/studio">{copy.hero.secondaryCta}</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.18 }}
            className="relative mx-auto flex aspect-square w-full max-w-[720px] items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-[11%] rounded-full border border-black/10" />
            <div className="absolute inset-[22%] rounded-full border border-black/6" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 48, ease: 'linear', repeat: Infinity }}
              className="absolute inset-0"
            >
              {orbitImages.map((src, index) => {
                const angle = (index / orbitImages.length) * Math.PI * 2;
                const radiusPercent = 38;
                const left = 50 + Math.cos(angle) * radiusPercent;
                const top = 50 + Math.sin(angle) * radiusPercent;

                return (
                  <div
                    key={`${src}-${index}`}
                    className="absolute aspect-[10/14] w-[16%] min-w-[80px] max-w-[118px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/60 bg-black shadow-[0_28px_70px_rgba(17,17,17,0.16)] sm:rounded-[34px]"
                    style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI + 90}deg)` }}
                  >
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src={src}
                        alt={`${copy.hero.eyebrow} ${index + 1}`}
                        fill
                        priority={index < 3}
                        className="object-cover"
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>

            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 62, ease: 'linear', repeat: Infinity }}
              className="absolute inset-[24%] rounded-full border border-black/8"
            />

            <div className="relative z-10 flex h-[48%] w-[48%] flex-col items-center justify-center rounded-full border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(247,242,232,0.92)_58%,_rgba(238,229,216,0.96))] px-8 text-center shadow-[0_34px_90px_rgba(17,17,17,0.12)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/36">{copy.thesis.eyebrow}</p>
              <h2 className="mt-4 font-serif text-2xl leading-[0.95] tracking-[-0.06em] text-black sm:text-[2.8rem]">
                {language === 'ko' ? (
                  <>
                    <span className="block">옷장 중심으로</span>
                    <span className="block">돌아가는 스타일 루프</span>
                  </>
                ) : (
                  'A style loop orbiting around your closet'
                )}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-black/56">
                {language === 'ko'
                  ? '레퍼런스와 실물 옷이 한 원 안에서 자연스럽게 이어지고, 그 중심에 내 옷장이 남습니다.'
                  : 'References and real garments keep circling inside one loop, with your own closet held at the center.'}
              </p>
            </div>
            <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(17,17,17,0.08),_transparent_68%)] blur-2xl" />
          </motion.div>
        </div>
      </section>

      <section className="px-5 py-18 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-3">
          {copy.support.map((item, index) => (
            <SectionReveal key={item.title} delay={index * 0.06}>
              <div className="space-y-4 border-t border-black/10 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/34">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{item.title}</h2>
                <p className="max-w-sm text-sm leading-7 text-black/58">{item.body}</p>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      <section className="border-y border-black/8 bg-[#111111] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionReveal>
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.thesis.eyebrow}</p>
              <h2 className="font-serif text-4xl tracking-[-0.05em]">{copy.thesis.title}</h2>
            </div>
          </SectionReveal>
          <div className="space-y-8">
            {copy.detail.map((item, index) => (
              <SectionReveal key={item.title} delay={index * 0.08}>
                <div className="grid gap-4 border-t border-white/10 pt-5 md:grid-cols-[0.8fr_1.2fr]">
                  <h3 className="font-serif text-2xl tracking-[-0.05em]">{item.title}</h3>
                  <p className="text-sm leading-7 text-white/70">{item.body}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <SectionReveal>
          <div className="mx-auto grid max-w-7xl gap-8 border-t border-black/10 pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/34">{copy.finalCta.eyebrow}</p>
              <h2 className="font-serif text-4xl tracking-[-0.05em] text-black">{copy.finalCta.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-black/58">{copy.finalCta.body}</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-black px-6 text-white hover:bg-black/90">
              <Link href="/app/closet">{copy.finalCta.action}</Link>
            </Button>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionReveal } from '@/components/layout/SectionReveal';
import { marketingCopy } from '@/features/renewal-marketing/content';
import { useLanguage } from '@/lib/LanguageContext';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const { language } = useLanguage();
  const copy = marketingCopy[language];

  const images = ['/cody3.jpg', '/cody4.jpg', '/cody5.jpg'];

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
                <Link href="/app">
                  {copy.hero.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-black/12 bg-white/80 px-6">
                <Link href="/how-it-works">{copy.hero.secondaryCta}</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.18 }}
            className="grid gap-4 sm:grid-cols-3 lg:gap-5"
          >
            {images.map((src, index) => (
              <div
                key={src}
                className={`relative overflow-hidden ${
                  index === 1 ? 'sm:translate-y-10' : index === 2 ? 'sm:translate-y-20' : ''
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black">
                  <Image
                    src={src}
                    alt={`FreeStyle hero visual ${index + 1}`}
                    fill
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Renewal Thesis</p>
              <h2 className="font-serif text-4xl tracking-[-0.05em]">
                Editorial brand outside. Calm decision engine inside.
              </h2>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/34">Start Now</p>
              <h2 className="font-serif text-4xl tracking-[-0.05em] text-black">{copy.finalCta.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-black/58">{copy.finalCta.body}</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-black px-6 text-white hover:bg-black/90">
              <Link href="/app">{copy.finalCta.action}</Link>
            </Button>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
}

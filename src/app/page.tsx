'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  // The user specifically requested using these 3 images
  const images = [
    { src: "/cody3.jpg", alt: t('hero.marquee_alt1') },
    { src: "/cody4.jpg", alt: t('hero.marquee_alt2') },
    { src: "/cody5.jpg", alt: t('hero.marquee_alt3') },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col justify-center">

      {/* 
        INFINITE MARQUEE BACKGROUND
      */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 25,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {[...images, ...images].map((img, index) => (
          <Image
            key={index}
            src={img.src}
            alt={img.alt}
            width={1000}
            height={1000}
            className="h-screen w-auto object-contain flex-shrink-0"
            priority={index === 0}
          />
        ))}
      </motion.div>

      {/* Global Overlay: Dark gradient for text readability */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

      {/* Hero Content (Centered/Left) */}
      <div className="absolute inset-0 z-20 container mx-auto px-6 flex flex-col justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="max-w-2xl space-y-8 pointer-events-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white/90 text-[11px] font-bold tracking-[0.2em] uppercase shadow-lg">
            <Sparkles className="w-3 h-3 text-amber-200" /> {t('hero.badge')}
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-medium leading-[0.95] tracking-tighter drop-shadow-2xl">
            {t('hero.title1')}{' '}
            <span className="text-white/60 italic">{t('hero.title2')}</span>
            <br />
            {t('hero.title3')}
          </h1>

          <p className="text-lg md:text-xl text-white/80 font-light max-w-md leading-relaxed drop-shadow-md whitespace-pre-line">
            {t('hero.desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 pt-8">
            <Button asChild size="lg" className="rounded-full h-16 px-10 text-lg bg-white text-black hover:bg-gray-200 border-none shadow-xl cursor-pointer">
              <Link href="/studio">
                {t('hero.start')} <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full h-16 px-10 text-lg border-white/40 text-white hover:bg-white/10 hover:text-white bg-black/20 backdrop-blur-sm cursor-pointer">
              <Link href="/trends">
                {t('hero.tryon')}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-6 right-6 z-20 flex justify-between text-[10px] text-white/60 uppercase tracking-widest font-medium drop-shadow-md pointer-events-none">
        <div>{t('footer.inc')}</div>
        <div className="hidden md:flex gap-8">
          <span>{t('footer.vi')}</span>
          <span>{t('footer.sd')}</span>
          <span>{t('footer.gt')}</span>
        </div>
        <div>{t('footer.cities')}</div>
      </div>

    </div>
  );
}

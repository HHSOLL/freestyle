import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import type { TrendItem, TrendTranslator } from '../types';

type TrendModalProps = {
  t: TrendTranslator;
  selectedTrend: TrendItem | null;
  onClose: () => void;
};

export function TrendModal({ t, selectedTrend, onClose }: TrendModalProps) {
  const resolveCategoryLabel = (trend: TrendItem) => {
    return [
      t(`trends.filter.gender.${trend.gender}`),
      t(`trends.filter.season.${trend.season}`),
      t(`trends.filter.style.${trend.style}`),
    ].join(' / ');
  };

  return (
    <AnimatePresence>
      {selectedTrend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/92 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative w-full max-w-6xl rounded-[34px] border border-white/20 overflow-hidden bg-[#f7f6f3] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.65)]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/80 border border-black/10 hover:bg-white transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-black/35" />
            </button>

            <div className="grid lg:grid-cols-[minmax(420px,1fr)_1fr]">
              <div className="relative overflow-hidden bg-[#eceae6] min-h-[420px] sm:min-h-[520px] lg:min-h-[760px]">
                <div
                  className="absolute inset-0 opacity-35"
                  style={{
                    backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10" />

                <motion.div
                  initial={{ scale: 1.05, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="absolute inset-4 sm:inset-8 flex items-center justify-center"
                >
                  <div className="relative w-full h-full max-w-[620px]">
                    <Image
                      src={selectedTrend.image}
                      alt={t('trends.alt.editorial')}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain rounded-[20px] shadow-[0_20px_50px_-25px_rgba(0,0,0,0.4)]"
                      priority
                    />
                  </div>
                </motion.div>
              </div>

              <div className="p-6 sm:p-10 lg:p-14 flex flex-col justify-center gap-7 bg-gradient-to-b from-white via-[#faf9f6] to-[#f4f2ec]">
                <div className="space-y-1">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-bold">
                    {t('trends.detail.creator')}
                  </p>
                  <p className="text-xl sm:text-2xl font-semibold tracking-tight text-black">{selectedTrend.creator}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-bold">
                    {t('trends.detail.outfit')}
                  </p>
                  <p className="text-3xl sm:text-4xl font-serif leading-tight text-black">{t(selectedTrend.nameKey)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-bold">
                    {t('trends.detail.category')}
                  </p>
                  <p className="text-sm sm:text-base text-black/75">{resolveCategoryLabel(selectedTrend)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-bold">
                    {t('trends.detail.description')}
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-black/70">
                    {t(selectedTrend.descKey)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { TREND_TAG_KEYS } from '../constants';
import type { TrendItem, TrendTranslator } from '../types';

type TrendModalProps = {
  t: TrendTranslator;
  selectedTrend: TrendItem | null;
  onClose: () => void;
};

export function TrendModal({ t, selectedTrend, onClose }: TrendModalProps) {
  return (
    <AnimatePresence>
      {selectedTrend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 40, rotate: 2 }}
            className="relative w-full max-w-6xl bg-[#fafafa] rounded-[48px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row min-h-[80vh]"
          >
            <div className="flex-1 relative bg-[#efefef] overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)',
                  backgroundSize: '16px 16px',
                }}
              />

              <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative w-full h-full p-8 md:p-12"
              >
                <Image
                  src={selectedTrend.image}
                  alt={t('trends.alt.editorial')}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                  priority
                />
              </motion.div>

              <div className="absolute bottom-10 left-10 mix-blend-difference text-white/40 text-[9px] font-bold tracking-[0.5em] uppercase vertical-text origin-bottom-left rotate-[-90deg]">
                {t('trends.meta.archive_prefix')} - {selectedTrend.id}
              </div>
            </div>

            <div className="flex-1 p-16 md:p-24 flex flex-col justify-between relative bg-white">
              <button
                onClick={onClose}
                className="absolute top-12 right-12 w-12 h-12 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors group"
              >
                <X className="w-5 h-5 text-black/20 group-hover:text-black" />
              </button>

              <div className="space-y-16">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/30 block mb-6">
                    {t('trends.popup.title')} - 001
                  </span>
                  <h2 className="text-6xl md:text-8xl font-serif font-light leading-[0.8] tracking-tighter text-black">
                    {t(selectedTrend.nameKey).split(' ')[0]} <br />
                    <span className="italic text-black/40 ml-0 md:ml-12 lowercase">
                      {t(selectedTrend.nameKey).split(' ')[1] || ''}
                    </span>
                  </h2>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-8"
                >
                  <p className="text-xl md:text-2xl font-serif leading-relaxed text-black/70 italic">
                    &quot;{t(selectedTrend.descKey)}&quot;
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {TREND_TAG_KEYS.map((tagKey) => (
                      <span
                        key={tagKey}
                        className="px-4 py-2 border border-black/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-black/40"
                      >
                        #{t(tagKey)}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-16 border-t border-black/5 flex items-center justify-between"
              >
                <div className="flex gap-12">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">
                      {t('trends.meta.popularity_label')}
                    </div>
                    <div className="text-xl font-serif text-black font-medium">
                      {t('trends.meta.popularity_value')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">
                      {t('trends.meta.context_label')}
                    </div>
                    <div className="text-xl font-serif text-black font-medium">
                      {t('trends.meta.context_value')}
                    </div>
                  </div>
                </div>
                <button className="px-8 py-4 bg-black text-white rounded-full text-[11px] font-bold tracking-widest uppercase hover:px-12 transition-all">
                  {t('trends.cta.explore')}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

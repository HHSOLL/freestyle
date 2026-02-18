import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { TrendTranslator } from '../types';

type TrendsHeaderProps = {
  t: TrendTranslator;
};

export function TrendsHeader({ t }: TrendsHeaderProps) {
  return (
    <div className="text-center mb-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-[10px] font-bold tracking-widest uppercase mb-6 text-white"
      >
        <Flame className="w-3 h-3 text-orange-500" /> {t('trends.badge')}
      </motion.div>
      <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter text-black uppercase mb-4 leading-[0.8]">
        {t('trends.title')}
      </h1>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { CommunityTranslator } from '../types';

type CommunityStatsProps = {
  t: CommunityTranslator;
};

export function CommunityStats({ t }: CommunityStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      className="mt-40 grid grid-cols-2 lg:grid-cols-4 gap-12 py-20 border-t border-black/5"
    >
      {[
        { label: t('community.stat1'), val: '12.8k' },
        { label: t('community.stat2'), val: '430k' },
        { label: t('community.stat3'), val: t('community.stat3.value') },
        { label: t('community.stat4'), val: t('community.stat4.value') },
      ].map((stat, index) => (
        <div key={index} className="text-center group">
          <div className="text-5xl md:text-6xl font-serif font-light mb-4 group-hover:scale-110 transition-transform duration-500">
            {stat.val}
          </div>
          <div className="text-[10px] font-black tracking-[0.4em] uppercase text-black/20 group-hover:text-black/40 transition-colors">
            {stat.label}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

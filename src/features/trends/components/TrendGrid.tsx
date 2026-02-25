import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import Image from 'next/image';
import type { TrendItem, TrendTranslator } from '../types';

type TrendGridProps = {
  t: TrendTranslator;
  items: TrendItem[];
  onSelectTrend: (trend: TrendItem) => void;
};

export function TrendGrid({ t, items, onSelectTrend }: TrendGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-8 lg:gap-10">
      {items.map((style, index) => (
        <motion.div
          key={`${style.id}-${index}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: (index % 6) * 0.1 }}
          onClick={() => onSelectTrend(style)}
          className="group cursor-pointer"
        >
          <div
            className={`relative aspect-[4/5] ${
              style.color || 'bg-gray-50'
            } min-h-[320px] sm:min-h-[340px] rounded-[24px] md:rounded-[48px] lg:rounded-[56px] overflow-hidden border border-black/5 shadow-sm group-hover:shadow-2xl group-hover:shadow-black/5 transition-all duration-700`}
          >
            <Image
              src={style.image}
              alt={t('trends.alt.card')}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={index < 3}
              className="object-cover opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700"
            />

            <div className="absolute top-10 left-10">
              <span className="text-4xl font-serif text-black/10 group-hover:text-black/20 transition-colors">
                {(index + 1).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-12">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Info className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

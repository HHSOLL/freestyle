/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from 'framer-motion';
import { Cuboid, ExternalLink, Save, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatSourceLink } from '../utils';
import type { Asset } from '@freestyle/contracts/domain-types';
import type { CanvasItem, StudioTranslator } from '../types';

type SummaryPanelProps = {
  t: StudioTranslator;
  canvasItems: CanvasItem[];
  assetById: Map<string, Asset>;
  selectedItemId: string | null;
  onClose: () => void;
  onRemoveFromCanvas: (id: string) => void;
  onOpenReviewModal: () => void;
  onOpenTryOnModal: () => void;
  onOpenFittingModal: () => void;
  onOpenSaveModal: () => void;
};

export function SummaryPanel({
  t,
  canvasItems,
  assetById,
  selectedItemId,
  onClose,
  onRemoveFromCanvas,
  onOpenReviewModal,
  onOpenTryOnModal,
  onOpenFittingModal,
  onOpenSaveModal,
}: SummaryPanelProps) {
  const [openLinkItemId, setOpenLinkItemId] = useState<string | null>(null);

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
          {t('studio.summary') || 'Summary'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-black/5 px-2 py-1 rounded font-bold">{canvasItems.length}</span>
          <button onClick={onClose} className="xl:hidden p-1.5 bg-black/5 rounded-full">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {canvasItems.map((item) => {
          const asset = assetById.get(item.assetId);
          if (!asset) return null;
          return (
            <div
              key={item.id}
              className={`relative flex items-center gap-4 p-3 rounded-xl border transition-all ${
                selectedItemId === item.id ? 'bg-black text-white' : 'bg-white border-black/5'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!asset.sourceUrl) return;
                  setOpenLinkItemId((prev) => (prev === item.id ? null : item.id));
                }}
                className={`flex items-center gap-4 flex-1 min-w-0 text-left ${
                  asset.sourceUrl ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="w-10 h-10 bg-[#F3F3F3] rounded-lg overflow-hidden shrink-0">
                  <img
                    src={asset.imageSrc}
                    alt={asset.name}
                    className="w-full h-full object-contain p-1 mix-blend-multiply"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate">{asset.name}</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setOpenLinkItemId((prev) => (prev === item.id ? null : prev));
                  onRemoveFromCanvas(item.id);
                }}
                className="p-1 px-2 border rounded-md hover:bg-black/5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {openLinkItemId === item.id && asset.sourceUrl && (
                  <motion.a
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    href={asset.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute left-12 top-full mt-2 z-20 max-w-[260px] rounded-2xl bg-black text-white px-3 py-2 text-[11px] font-semibold shadow-xl"
                  >
                    <span className="block truncate">{formatSourceLink(asset.sourceUrl)}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-white/80">
                      <ExternalLink className="w-3 h-3" />
                      {t('studio.asset.link.open') || 'Open product link'}
                    </span>
                    <span className="absolute -top-1 left-4 w-2 h-2 rotate-45 bg-black" />
                  </motion.a>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="mt-8 pt-6 border-t border-black/5">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button
            className="h-12 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest"
            onClick={onOpenReviewModal}
            disabled={canvasItems.length === 0}
          >
            {t('studio.review_btn') || 'AI Review'}
          </Button>
          <Button
            className="h-12 rounded-xl bg-black/85 text-white text-[10px] font-black uppercase tracking-widest"
            onClick={onOpenTryOnModal}
            disabled={canvasItems.length === 0}
          >
            {t('studio.tryon_btn') || 'AI Try-on'}
          </Button>
        </div>
        <Button
          className="mb-2 h-12 w-full rounded-xl bg-[#d9ccb9] text-[10px] font-black uppercase tracking-widest text-black hover:bg-[#d1c1ac]"
          onClick={onOpenFittingModal}
          disabled={assetById.size === 0}
        >
          <Cuboid className="mr-2 h-4 w-4" />
          3D Fitting
        </Button>
        <Button
          className="w-full h-15 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-xl"
          onClick={onOpenSaveModal}
          disabled={canvasItems.length === 0}
        >
          <Save className="w-4 h-4 mr-2" /> {t('studio.save') || 'Save'}
        </Button>
      </div>
    </div>
  );
}

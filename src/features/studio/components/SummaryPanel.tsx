/* eslint-disable @next/next/no-img-element */

import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Asset, CanvasItem, StudioTranslator } from '../types';

type SummaryPanelProps = {
  t: StudioTranslator;
  canvasItems: CanvasItem[];
  assetById: Map<string, Asset>;
  selectedItemId: string | null;
  onClose: () => void;
  onRemoveFromCanvas: (id: string) => void;
  onOpenReviewModal: () => void;
  onOpenTryOnModal: () => void;
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
  onOpenSaveModal,
}: SummaryPanelProps) {
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
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                selectedItemId === item.id ? 'bg-black text-white' : 'bg-white border-black/5'
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
              <button
                onClick={() => onRemoveFromCanvas(item.id)}
                className="p-1 px-2 border rounded-md hover:bg-black/5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
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

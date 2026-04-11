/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutGrid, Link as LinkIcon, Plus, Search, ShoppingCart, Trash2, Upload } from 'lucide-react';
import type { Asset } from '@freestyle/contracts/domain-types';
import type { AssetCategory, StudioCategoryOption, StudioTranslator } from '../types';

type AssetLibraryProps = {
  t: StudioTranslator;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenUploadModal: () => void;
  onOpenImportModal: () => void;
  onOpenCartImportModal: () => void;
  isCategoryMenuOpen: boolean;
  onToggleCategoryMenu: () => void;
  onCloseCategoryMenu: () => void;
  activeCategoryLabel: string;
  categories: StudioCategoryOption[];
  selectedCategory: AssetCategory;
  onSelectCategory: (category: AssetCategory) => void;
  filteredAssets: Asset[];
  onAddAssetToCanvas: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
};

export function AssetLibrary({
  t,
  searchQuery,
  onSearchQueryChange,
  onOpenUploadModal,
  onOpenImportModal,
  onOpenCartImportModal,
  isCategoryMenuOpen,
  onToggleCategoryMenu,
  onCloseCategoryMenu,
  activeCategoryLabel,
  categories,
  selectedCategory,
  onSelectCategory,
  filteredAssets,
  onAddAssetToCanvas,
  onDeleteAsset,
}: AssetLibraryProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
            {t('studio.assets.title') || 'Assets'}
          </h2>
          <LayoutGrid className="w-4 h-4 text-black/10" />
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={t('studio.assets.search') || 'Search assets...'}
            className="w-full h-11 pl-11 pr-4 bg-black/[0.03] border-0 rounded-xl text-[13px] focus:ring-1 focus:ring-black/10 transition-all font-medium"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onOpenUploadModal}
            className="flex items-center justify-center gap-2 h-11 bg-black/5 hover:bg-black/10 text-black rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
          >
            <Upload className="w-3.5 h-3.5" />
            {t('studio.import_image')}
          </button>
          <button
            onClick={onOpenImportModal}
            className="flex items-center justify-center gap-2 h-11 bg-black/5 hover:bg-black/10 text-black rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {t('studio.import_link')}
          </button>
          <button
            onClick={onOpenCartImportModal}
            className="flex items-center justify-center gap-2 h-11 bg-black/5 hover:bg-black/10 text-black rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {t('studio.cart_import.button') || 'Cart'}
          </button>
        </div>
        <div className="relative">
          <button
            onClick={onToggleCategoryMenu}
            className="w-full flex items-center justify-between px-4 h-11 bg-black text-white rounded-xl shadow-lg shadow-black/5 group"
          >
            <span className="text-[11px] font-bold uppercase tracking-widest">{activeCategoryLabel}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isCategoryMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <AnimatePresence>
            {isCategoryMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={onCloseCategoryMenu}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 p-2 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 space-y-1"
                >
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        onSelectCategory(category.id);
                        onCloseCategoryMenu();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        selectedCategory === category.id
                          ? 'bg-black/5 text-black font-bold'
                          : 'text-black/40 hover:bg-black/5 hover:text-black'
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        {category.label}
                      </span>
                      {selectedCategory === category.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar">
        <div className="grid grid-cols-2 gap-4">
          {filteredAssets.map((asset) => (
            <motion.div key={asset.id} layout whileHover={{ y: -4 }} className="group cursor-pointer">
              <div className="aspect-[3/4] bg-[#F3F3F3] rounded-2xl border border-black/[0.03] overflow-hidden relative mb-2">
                <img
                  src={asset.imageSrc}
                  alt={asset.name}
                  onClick={() => onAddAssetToCanvas(asset)}
                  className="absolute inset-0 w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute left-2 top-2 flex flex-col gap-1 pointer-events-none">
                  {asset.source !== 'inventory' && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[7px] font-black uppercase tracking-widest text-white">
                      {asset.source}
                    </span>
                  )}
                  {asset.removedBackground && (
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/90 backdrop-blur-md text-[7px] font-black uppercase tracking-widest text-white">
                      Cutout
                    </span>
                  )}
                </div>

                {asset.source !== 'inventory' && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteAsset(asset.id);
                    }}
                    className="absolute right-2 top-2 w-7 h-7 bg-white/80 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div
                  onClick={() => onAddAssetToCanvas(asset)}
                  className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div onClick={() => onAddAssetToCanvas(asset)}>
                <p className="text-[10px] font-black uppercase tracking-widest truncate leading-tight mb-0.5">
                  {asset.name}
                </p>
                <p className="text-[10px] font-bold text-black/20 leading-none">
                  {asset.price ? `$${asset.price.toFixed(2)}` : 'Custom'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

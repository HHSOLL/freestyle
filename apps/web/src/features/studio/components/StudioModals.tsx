/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Asset, AssetCategory, CanvasItem, StudioCategoryOption, StudioTranslator } from '../types';
import { TryOnWorkbench } from './TryOnWorkbench';

type ReviewResult = {
  overallScore?: number;
  mood?: string;
  silhouette?: string;
  balance?: string;
  colorPalette?: string;
  fitAdvice?: string;
  colorAdvice?: string;
  itemBreakdown?: string[];
  strengths?: string[];
  improvements?: string[];
  occasions?: string[];
  summary?: string;
};

type ImportImageCandidate = {
  id: string;
  url: string;
  source: string;
  finalScore: number;
  width: number;
  height: number;
  isModelLike: boolean;
  facesOverMinArea: number;
};

type StudioModalsProps = {
  t: StudioTranslator;
  language: string;
  isSaveModalOpen: boolean;
  saveTitle: string;
  isSavingOutfit: boolean;
  saveErrorMessage: string | null;
  onSaveTitleChange: (value: string) => void;
  onCloseSaveModal: () => void;
  onSaveOutfit: () => void;
  isTextModalOpen: boolean;
  newTextContent: string;
  onNewTextContentChange: (value: string) => void;
  onCloseTextModal: () => void;
  onAddTextToCanvas: () => void;
  isImportModalOpen: boolean;
  importUrl: string;
  onImportUrlChange: (value: string) => void;
  newItemName: string;
  onNewItemNameChange: (value: string) => void;
  newItemCategory: AssetCategory;
  onNewItemCategoryChange: (value: string) => void;
  categories: StudioCategoryOption[];
  isProcessing: boolean;
  processingStatus: string;
  onCloseImportModal: () => void;
  onImportSubmit: () => void;
  isImportCandidateModalOpen: boolean;
  importCandidates: ImportImageCandidate[];
  selectedImportCandidateUrl: string;
  onSelectedImportCandidateUrlChange: (value: string) => void;
  onCloseImportCandidateModal: () => void;
  onImportWithSelectedCandidate: () => void;
  isCartImportModalOpen: boolean;
  cartImportUrl: string;
  onCartImportUrlChange: (value: string) => void;
  cartImportCategory: AssetCategory;
  onCartImportCategoryChange: (value: string) => void;
  isCartImporting: boolean;
  cartImportStatus: string;
  onCloseCartImportModal: () => void;
  onCartImportSubmit: () => void;
  isUploadModalOpen: boolean;
  hasUploadFile: boolean;
  uploadPreview: string | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCloseUploadModal: () => void;
  onUploadSubmit: () => void;
  isReviewModalOpen: boolean;
  onCloseReviewModal: () => void;
  reviewGender: string;
  onReviewGenderChange: (value: string) => void;
  reviewOccasion: string;
  onReviewOccasionChange: (value: string) => void;
  reviewOccasionDetail: string;
  onReviewOccasionDetailChange: (value: string) => void;
  reviewPersonalColor: string;
  onReviewPersonalColorChange: (value: string) => void;
  isReviewLoading: boolean;
  reviewPreviewImage: string | null;
  reviewResult: ReviewResult | null;
  reviewRawText: string | null;
  onGenerateReview: () => void;
  isTryOnModalOpen: boolean;
  onCloseTryOnModal: () => void;
  canvasItems: CanvasItem[];
  assetById: Map<string, Asset>;
  selectedItemId: string | null;
  modelPhotoPreview: string | null;
  hasModelPhoto: boolean;
  onTryOnModelChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isTryOnLoading: boolean;
  tryOnResultImage: string | null;
  tryOnError: string | null;
  onTryOnGenerate: () => void;
  onTryOnDownload: () => void;
};

export function StudioModals({
  t,
  language,
  isSaveModalOpen,
  saveTitle,
  isSavingOutfit,
  saveErrorMessage,
  onSaveTitleChange,
  onCloseSaveModal,
  onSaveOutfit,
  isTextModalOpen,
  newTextContent,
  onNewTextContentChange,
  onCloseTextModal,
  onAddTextToCanvas,
  isImportModalOpen,
  importUrl,
  onImportUrlChange,
  newItemName,
  onNewItemNameChange,
  newItemCategory,
  onNewItemCategoryChange,
  categories,
  isProcessing,
  processingStatus,
  onCloseImportModal,
  onImportSubmit,
  isImportCandidateModalOpen,
  importCandidates,
  selectedImportCandidateUrl,
  onSelectedImportCandidateUrlChange,
  onCloseImportCandidateModal,
  onImportWithSelectedCandidate,
  isCartImportModalOpen,
  cartImportUrl,
  onCartImportUrlChange,
  cartImportCategory,
  onCartImportCategoryChange,
  isCartImporting,
  cartImportStatus,
  onCloseCartImportModal,
  onCartImportSubmit,
  isUploadModalOpen,
  hasUploadFile,
  uploadPreview,
  onFileChange,
  onCloseUploadModal,
  onUploadSubmit,
  isReviewModalOpen,
  onCloseReviewModal,
  reviewGender,
  onReviewGenderChange,
  reviewOccasion,
  onReviewOccasionChange,
  reviewOccasionDetail,
  onReviewOccasionDetailChange,
  reviewPersonalColor,
  onReviewPersonalColorChange,
  isReviewLoading,
  reviewPreviewImage,
  reviewResult,
  reviewRawText,
  onGenerateReview,
  isTryOnModalOpen,
  onCloseTryOnModal,
  canvasItems,
  assetById,
  selectedItemId,
  modelPhotoPreview,
  hasModelPhoto,
  onTryOnModelChange,
  isTryOnLoading,
  tryOnResultImage,
  tryOnError,
  onTryOnGenerate,
  onTryOnDownload,
}: StudioModalsProps) {
  return (
    <AnimatePresence>
      {isSaveModalOpen && (
        <div key="save-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-white rounded-[40px] p-8 space-y-8 shadow-2xl"
          >
            <h2 className="text-3xl font-serif">Save Outfit</h2>
            <input
              type="text"
              value={saveTitle}
              onChange={(event) => onSaveTitleChange(event.target.value)}
              placeholder="Outfit Name"
              className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold"
            />
            {saveErrorMessage ? (
              <p className="text-sm leading-6 text-red-600">{saveErrorMessage}</p>
            ) : null}
            <div className="flex gap-4">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl" onClick={onCloseSaveModal}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-black text-white"
                onClick={onSaveOutfit}
                disabled={isSavingOutfit}
              >
                {isSavingOutfit ? t('studio.save.loading') || 'Saving...' : 'Save'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isTextModalOpen && (
        <div key="text-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-[40px] p-10 space-y-8 shadow-2xl"
          >
            <h2 className="text-3xl font-serif">Add Tag</h2>
            <div className="space-y-6">
              <input
                autoFocus
                value={newTextContent}
                onChange={(event) => onNewTextContentChange(event.target.value)}
                placeholder="Type..."
                className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl" onClick={onCloseTextModal}>
                Cancel
              </Button>
              <Button className="flex-1 h-14 rounded-2xl bg-black text-white" onClick={onAddTextToCanvas}>
                Add
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isImportModalOpen && (
        <div key="import-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-[40px] p-10 space-y-8 shadow-2xl"
          >
            <div>
              <h2 className="text-3xl font-serif mb-2">{t('studio.import.title')}</h2>
              <p className="text-sm text-black/40">{t('studio.import.desc')}</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                  {t('studio.import.url_label')}
                </label>
                <input
                  value={importUrl}
                  onChange={(event) => onImportUrlChange(event.target.value)}
                  placeholder={t('studio.import.url_placeholder')}
                  className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                  {t('studio.import.name_label')}
                </label>
                <input
                  value={newItemName}
                  onChange={(event) => onNewItemNameChange(event.target.value)}
                  placeholder={t('studio.import.name_placeholder')}
                  className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                  {t('studio.import.category_label')}
                </label>
                <select
                  value={newItemCategory}
                  onChange={(event) => onNewItemCategoryChange(event.target.value)}
                  className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10 appearance-none"
                >
                  {categories
                    .filter((category) => category.id !== 'all')
                    .map((category, index) => (
                      <option key={`${category.id || 'category'}-${index}`} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="ghost"
                className="flex-1 h-14 rounded-2xl"
                onClick={onCloseImportModal}
                disabled={isProcessing}
              >
                {t('studio.import.cancel')}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-black text-white"
                onClick={onImportSubmit}
                disabled={isProcessing || !importUrl.trim()}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {processingStatus}
                  </>
                ) : (
                  t('studio.import.cta')
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isImportCandidateModalOpen && (
        <div key="import-candidate-modal" className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl bg-white rounded-[40px] p-8 md:p-10 space-y-6 shadow-2xl"
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-serif mb-2">
                {t('studio.import.candidate.title') || 'Pick the product-only image'}
              </h2>
              <p className="text-sm text-black/45">
                {t('studio.import.candidate.desc') ||
                  'Automatic detection failed. Choose the best standalone front shot and retry.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[52vh] overflow-y-auto pr-1">
              {importCandidates.map((candidate, index) => {
                const selected = selectedImportCandidateUrl === candidate.url;
                const candidateKey = candidate.id.trim().length > 0 ? candidate.id : `${candidate.source}:${candidate.url}:${index}`;
                return (
                  <button
                    key={candidateKey}
                    type="button"
                    onClick={() => onSelectedImportCandidateUrlChange(candidate.url)}
                    className={`group text-left rounded-3xl overflow-hidden border transition-all ${
                      selected ? 'border-black shadow-md' : 'border-black/10 hover:border-black/30'
                    }`}
                  >
                    <div className="aspect-square bg-black/[0.03]">
                      <img
                        src={candidate.url}
                        alt="candidate"
                        className="w-full h-full object-contain bg-white"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-xs font-bold text-black/60 truncate">{candidate.source}</p>
                      <p className="text-[11px] text-black/50">
                        {candidate.width}×{candidate.height}
                      </p>
                      <p className={`text-[11px] font-semibold ${candidate.isModelLike ? 'text-black/45' : 'text-black/75'}`}>
                        {candidate.isModelLike
                          ? `${t('studio.import.candidate.model_hint') || 'Model-like detected'} (${candidate.facesOverMinArea})`
                          : t('studio.import.candidate.product_hint') || 'Likely standalone product'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 pt-2">
              <Button
                variant="ghost"
                className="flex-1 h-14 rounded-2xl"
                onClick={onCloseImportCandidateModal}
                disabled={isProcessing}
              >
                {t('studio.import.cancel')}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-black text-white"
                onClick={onImportWithSelectedCandidate}
                disabled={isProcessing || !selectedImportCandidateUrl}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {processingStatus || t('studio.import.loading')}
                  </>
                ) : (
                  t('studio.import.candidate.cta') || 'Use this image'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isCartImportModalOpen && (
        <div key="cart-import-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-[40px] p-10 space-y-8 shadow-2xl"
          >
            <div>
              <h2 className="text-3xl font-serif mb-2">{t('studio.cart_import.title') || 'Import cart link'}</h2>
              <p className="text-sm text-black/40">
                {t('studio.cart_import.desc') || 'Extract products from cart and register them as cutout assets.'}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                  {t('studio.cart_import.url_label') || 'Cart URL'}
                </label>
                <input
                  value={cartImportUrl}
                  onChange={(event) => onCartImportUrlChange(event.target.value)}
                  placeholder={t('studio.import.url_placeholder')}
                  className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                  {t('studio.import.category_label')}
                </label>
                <select
                  value={cartImportCategory}
                  onChange={(event) => onCartImportCategoryChange(event.target.value)}
                  className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10 appearance-none"
                >
                  {categories
                    .filter((category) => category.id !== 'all')
                    .map((category, index) => (
                      <option key={`${category.id || 'category'}-${index}`} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="ghost"
                className="flex-1 h-14 rounded-2xl"
                onClick={onCloseCartImportModal}
                disabled={isCartImporting}
              >
                {t('studio.import.cancel')}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-black text-white"
                onClick={onCartImportSubmit}
                disabled={isCartImporting || !cartImportUrl.trim()}
              >
                {isCartImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {cartImportStatus || t('studio.cart_import.loading') || 'Importing...'}
                  </>
                ) : (
                  t('studio.cart_import.cta') || 'Import cart'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isUploadModalOpen && (
        <div key="upload-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-[40px] p-10 space-y-8 shadow-2xl"
          >
            <div>
              <h2 className="text-3xl font-serif mb-2">{t('studio.upload.title')}</h2>
              <p className="text-sm text-black/40">{t('studio.upload.desc')}</p>
            </div>
            <div className="space-y-6">
              <div className="relative aspect-video bg-black/5 rounded-[32px] overflow-hidden flex items-center justify-center border-2 border-dashed border-black/10 hover:border-black/20 transition-colors group">
                {uploadPreview ? (
                  <img src={uploadPreview} className="absolute inset-0 w-full h-full object-contain p-4" alt="preview" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-black/20 group-hover:text-black/40 transition-colors">
                    <Upload className="w-10 h-10" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('studio.upload.drop')}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                    {t('studio.upload.name_label')}
                  </label>
                  <input
                    value={newItemName}
                    onChange={(event) => onNewItemNameChange(event.target.value)}
                    placeholder={t('studio.upload.name_placeholder')}
                    className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">
                    {t('studio.upload.category_label')}
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(event) => onNewItemCategoryChange(event.target.value)}
                    className="w-full h-14 bg-black/5 border-0 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-black/10 appearance-none"
                  >
                    {categories
                      .filter((category) => category.id !== 'all')
                      .map((category, index) => (
                        <option key={`${category.id || 'category'}-${index}`} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="ghost"
                className="flex-1 h-14 rounded-2xl"
                onClick={onCloseUploadModal}
                disabled={isProcessing}
              >
                {t('studio.upload.cancel')}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-black text-white"
                onClick={onUploadSubmit}
                disabled={isProcessing || !hasUploadFile}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {processingStatus}
                  </>
                ) : (
                  t('studio.upload.cta')
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {isReviewModalOpen && (
        <div key="review-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-[36px] shadow-2xl flex flex-col"
          >
            <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif">{t('studio.review.title')}</h2>
                <p className="text-sm text-black/45 mt-1">{t('studio.review.desc')}</p>
              </div>
              <Button variant="ghost" onClick={onCloseReviewModal}>
                {t('studio.review.close')}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="aspect-[4/5] rounded-2xl bg-black/5 overflow-hidden border border-black/5 flex items-center justify-center">
                  {reviewPreviewImage ? (
                    <img src={reviewPreviewImage} alt={t('studio.review.preview_alt')} className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs text-black/40 font-bold uppercase">{t('studio.review.preview_empty')}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={reviewGender}
                    onChange={(event) => onReviewGenderChange(event.target.value)}
                    className="h-12 bg-black/5 border-0 rounded-xl px-4 text-sm font-semibold focus:ring-1 focus:ring-black/10"
                  >
                    <option value="">{t('studio.review.select_placeholder')}</option>
                    <option value="female">{t('studio.review.gender_female')}</option>
                    <option value="male">{t('studio.review.gender_male')}</option>
                    <option value="nonbinary">{t('studio.review.gender_nonbinary')}</option>
                  </select>
                  <select
                    value={reviewOccasion}
                    onChange={(event) => onReviewOccasionChange(event.target.value)}
                    className="h-12 bg-black/5 border-0 rounded-xl px-4 text-sm font-semibold focus:ring-1 focus:ring-black/10"
                  >
                    <option value="">{t('studio.review.select_placeholder')}</option>
                    <option value="daily">{t('studio.review.occasion_daily')}</option>
                    <option value="work">{t('studio.review.occasion_work')}</option>
                    <option value="date">{t('studio.review.occasion_date')}</option>
                    <option value="travel">{t('studio.review.occasion_travel')}</option>
                    <option value="formal">{t('studio.review.occasion_formal')}</option>
                    <option value="party">{t('studio.review.occasion_party')}</option>
                    <option value="custom">{t('studio.review.occasion_custom')}</option>
                  </select>
                  {reviewOccasion === 'custom' && (
                    <input
                      value={reviewOccasionDetail}
                      onChange={(event) => onReviewOccasionDetailChange(event.target.value)}
                      placeholder={t('studio.review.occasion_placeholder')}
                      className="h-12 bg-black/5 border-0 rounded-xl px-4 text-sm font-semibold focus:ring-1 focus:ring-black/10"
                    />
                  )}
                  <select
                    value={reviewPersonalColor}
                    onChange={(event) => onReviewPersonalColorChange(event.target.value)}
                    className="h-12 bg-black/5 border-0 rounded-xl px-4 text-sm font-semibold focus:ring-1 focus:ring-black/10"
                  >
                    <option value="">{t('studio.review.personal_color_optional')}</option>
                    <option value="spring_warm">{t('studio.review.personal_color_spring')}</option>
                    <option value="summer_cool">{t('studio.review.personal_color_summer')}</option>
                    <option value="autumn_warm">{t('studio.review.personal_color_autumn')}</option>
                    <option value="winter_cool">{t('studio.review.personal_color_winter')}</option>
                    <option value="neutral">{t('studio.review.personal_color_neutral')}</option>
                  </select>
                  <Button
                    className="h-12 rounded-xl bg-black text-white font-black uppercase tracking-widest text-[11px]"
                    onClick={onGenerateReview}
                    disabled={isReviewLoading}
                  >
                    {isReviewLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t('studio.review.loading')}
                      </>
                    ) : (
                      t('studio.review.cta')
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-black/[0.015] p-5 text-sm space-y-3">
                {!reviewResult && !reviewRawText && (
                  <p className="text-black/45">{t('studio.review.placeholder')}</p>
                )}
                {reviewResult && (
                  <>
                    <p className="text-lg font-black">
                      {t('studio.review.score')}: {typeof reviewResult.overallScore === 'number' ? reviewResult.overallScore : '-'}
                    </p>
                    <p><span className="font-bold">{t('studio.review.mood')}:</span> {reviewResult.mood || '-'}</p>
                    <p><span className="font-bold">{t('studio.review.silhouette')}:</span> {reviewResult.silhouette || '-'}</p>
                    <p><span className="font-bold">{t('studio.review.balance')}:</span> {reviewResult.balance || '-'}</p>
                    <p><span className="font-bold">{t('studio.review.palette')}:</span> {reviewResult.colorPalette || '-'}</p>
                    <p><span className="font-bold">{t('studio.review.fit')}:</span> {reviewResult.fitAdvice || '-'}</p>
                    <p><span className="font-bold">{t('studio.review.color')}:</span> {reviewResult.colorAdvice || '-'}</p>
                    {Array.isArray(reviewResult.itemBreakdown) && reviewResult.itemBreakdown.length > 0 && (
                      <div>
                        <p className="font-bold mb-1">{t('studio.review.items')}</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {reviewResult.itemBreakdown.map((line, idx) => (
                            <li key={`${line}-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(reviewResult.strengths) && reviewResult.strengths.length > 0 && (
                      <div>
                        <p className="font-bold mb-1">{t('studio.review.strengths')}</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {reviewResult.strengths.map((line, idx) => (
                            <li key={`${line}-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(reviewResult.improvements) && reviewResult.improvements.length > 0 && (
                      <div>
                        <p className="font-bold mb-1">{t('studio.review.improvements')}</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {reviewResult.improvements.map((line, idx) => (
                            <li key={`${line}-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reviewResult.summary && (
                      <div>
                        <p className="font-bold mb-1">{t('studio.review.summary')}</p>
                        <p className="leading-relaxed">{reviewResult.summary}</p>
                      </div>
                    )}
                  </>
                )}
                {reviewRawText && (
                  <pre className="text-xs whitespace-pre-wrap rounded-lg bg-black text-white p-4 overflow-auto max-h-[40vh]">
                    {reviewRawText}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isTryOnModalOpen && (
        <div key="tryon-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] bg-white shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif">{t('studio.tryon_btn')}</h2>
                <p className="text-sm text-black/45 mt-1">{t('studio.modal.desc')}</p>
              </div>
              <Button variant="ghost" onClick={onCloseTryOnModal}>
                {t('studio.review.close')}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <TryOnWorkbench
                t={t}
                language={language}
                canvasItems={canvasItems}
                assetById={assetById}
                selectedItemId={selectedItemId}
                modelPhotoPreview={modelPhotoPreview}
                hasModelPhoto={hasModelPhoto}
                onTryOnModelChange={onTryOnModelChange}
                isTryOnLoading={isTryOnLoading}
                tryOnResultImage={tryOnResultImage}
                tryOnError={tryOnError}
                onTryOnGenerate={onTryOnGenerate}
                onTryOnDownload={onTryOnDownload}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

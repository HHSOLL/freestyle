'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { AssetLibrary } from '@/features/studio/components/AssetLibrary';
import { StudioCanvas } from '@/features/studio/components/StudioCanvas';
import { StudioDrawers } from '@/features/studio/components/StudioDrawers';
import { StudioModals } from '@/features/studio/components/StudioModals';
import { SummaryPanel } from '@/features/studio/components/SummaryPanel';
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_WIDTH_PERCENT,
  DEFAULT_CUSTOM_RATIO,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SIZE,
} from '@/features/studio/constants';
import { getErrorMessage, isEditableAssetCategory, toAsset } from '@/features/studio/utils';
import type {
  Asset,
  AssetCategory,
  CanvasItem,
  CanvasSize,
  EditableAssetCategory,
  StudioCategoryOption,
  TextItem,
} from '@/features/studio/types';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ImportJobPendingStatus = 'waiting' | 'active' | 'delayed' | 'paused' | 'waiting-children' | 'queued';

type ImportJobUrlCompleted = {
  status: 'completed';
  type: 'url';
  asset: unknown;
  warnings?: string[];
  selectedImageUrl?: string;
};

type ImportJobCartCompleted = {
  status: 'completed';
  type: 'cart';
  assets?: unknown[];
  totalProducts?: number;
  importedCount?: number;
  failedCount?: number;
  failed?: unknown[];
};

type ImportJobFileCompleted = {
  status: 'completed';
  type: 'file';
  asset: unknown;
  removedBackground?: boolean;
  warnings?: string[];
};

type ImportJobFailed = {
  status: 'failed';
  code?: string;
  error?: string;
};

type ImportJobPollResult =
  | ImportJobUrlCompleted
  | ImportJobCartCompleted
  | ImportJobFileCompleted
  | ImportJobFailed
  | { status: ImportJobPendingStatus; progress?: unknown };

const normalizeReviewResult = (value: unknown): ReviewResult | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const asStringArray = (entry: unknown) =>
    Array.isArray(entry) ? entry.filter((item): item is string => typeof item === 'string') : undefined;
  return {
    overallScore: typeof record.overallScore === 'number' ? record.overallScore : undefined,
    mood: typeof record.mood === 'string' ? record.mood : undefined,
    silhouette: typeof record.silhouette === 'string' ? record.silhouette : undefined,
    balance: typeof record.balance === 'string' ? record.balance : undefined,
    colorPalette: typeof record.colorPalette === 'string' ? record.colorPalette : undefined,
    fitAdvice: typeof record.fitAdvice === 'string' ? record.fitAdvice : undefined,
    colorAdvice: typeof record.colorAdvice === 'string' ? record.colorAdvice : undefined,
    itemBreakdown: asStringArray(record.itemBreakdown),
    strengths: asStringArray(record.strengths),
    improvements: asStringArray(record.improvements),
    occasions: asStringArray(record.occasions),
    summary: typeof record.summary === 'string' ? record.summary : undefined,
  };
};

export default function StudioPage() {
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [canvasBackground, setCanvasBackground] = useState(DEFAULT_CANVAS_BACKGROUND);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>('square');
  const [customRatio, setCustomRatio] = useState(DEFAULT_CUSTOM_RATIO);
  const [canvasWidthPercent, setCanvasWidthPercent] = useState(DEFAULT_CANVAS_WIDTH_PERCENT);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSizePickerOpen, setIsSizePickerOpen] = useState(false);

  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<EditableAssetCategory>('tops');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isCartImportModalOpen, setIsCartImportModalOpen] = useState(false);
  const [cartImportUrl, setCartImportUrl] = useState('');
  const [cartImportCategory, setCartImportCategory] = useState<EditableAssetCategory>('custom');
  const [isCartImporting, setIsCartImporting] = useState(false);
  const [cartImportStatus, setCartImportStatus] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [reviewGender, setReviewGender] = useState('');
  const [reviewOccasion, setReviewOccasion] = useState('');
  const [reviewOccasionDetail, setReviewOccasionDetail] = useState('');
  const [reviewPersonalColor, setReviewPersonalColor] = useState('');
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewPreviewImage, setReviewPreviewImage] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewRawText, setReviewRawText] = useState<string | null>(null);
  const [modelPhotoPreview, setModelPhotoPreview] = useState<string | null>(null);
  const [isTryOnLoading, setIsTryOnLoading] = useState(false);
  const [tryOnResultImage, setTryOnResultImage] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nextZIndex = useRef(1);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const res = await fetch('/api/assets');
        const data = await res.json();
        if (res.ok && Array.isArray(data?.assets)) {
          const parsedAssets = data.assets
            .map((asset: unknown) => toAsset(asset))
            .filter((asset: Asset | null): asset is Asset => Boolean(asset));
          setUserAssets(parsedAssets);
        }
      } catch {
        // ignore read errors in local development
      }
    };
    loadAssets();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('freestyle:model-photo');
      if (stored) {
        setModelPhotoPreview(stored);
      }
    } catch {
      // ignore localStorage read errors
    }
  }, []);

  const inventory = useMemo<Asset[]>(() => [], []);
  const assets = useMemo(() => [...inventory, ...userAssets], [inventory, userAssets]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const categories = useMemo<StudioCategoryOption[]>(
    () => [
      { id: 'all', label: t('studio.categories.all') || 'All' },
      { id: 'tops', label: t('studio.categories.tops') || 'Tops' },
      { id: 'bottoms', label: t('studio.categories.bottoms') || 'Bottoms' },
      { id: 'outerwear', label: t('studio.categories.outerwear') || 'Outerwear' },
      { id: 'shoes', label: t('studio.categories.shoes') || 'Shoes' },
      { id: 'accessories', label: t('studio.categories.accessories') || 'Accessories' },
      { id: 'custom', label: t('studio.categories.custom') || 'Custom' },
    ],
    [t]
  );

  const activeCategoryLabel = useMemo(() => {
    return categories.find((category) => category.id === selectedCategory)?.label || 'Category';
  }, [categories, selectedCategory]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return assets.filter((asset) => {
      if (selectedCategory !== 'all' && asset.category !== selectedCategory) return false;
      if (!query) return true;
      return asset.name.toLowerCase().includes(query);
    });
  }, [assets, searchQuery, selectedCategory]);

  const selectCanvasItem = (id: string) => {
    setSelectedItemId(id);
    setSelectedTextId(null);
  };

  const selectTextItem = (id: string) => {
    setSelectedTextId(id);
    setSelectedItemId(null);
  };

  const addAssetToCanvas = (asset: Asset) => {
    const id = `${asset.id}-${Date.now()}`;
    const newItem: CanvasItem = {
      id,
      assetId: asset.id,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      zIndex: nextZIndex.current++,
    };
    setCanvasItems((prev) => [...prev, newItem]);
    selectCanvasItem(id);
    if (isAssetLibraryOpen) setIsAssetLibraryOpen(false);
  };

  const removeFromCanvas = (id: string) => {
    setCanvasItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const addTextToCanvas = () => {
    if (!newTextContent.trim()) return;
    const id = `text-${Date.now()}`;
    const newItem: TextItem = {
      id,
      text: newTextContent,
      x: 0,
      y: 0,
      fontSize: DEFAULT_TEXT_SIZE,
      color: DEFAULT_TEXT_COLOR,
      scale: 1,
      rotation: 0,
      zIndex: nextZIndex.current++,
    };
    setTextItems((prev) => [...prev, newItem]);
    setNewTextContent('');
    setIsTextModalOpen(false);
    selectTextItem(id);
  };

  const pollImportJob = async (
    jobId: string,
    onStatus?: (status: ImportJobPendingStatus) => void
  ): Promise<ImportJobUrlCompleted | ImportJobCartCompleted | ImportJobFileCompleted> => {
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const res = await fetch(`/api/import-jobs/${jobId}`);
      const data = (await res.json()) as ImportJobPollResult;
      const status = typeof data?.status === 'string' ? data.status : '';

      if (status === 'completed') {
        return data as ImportJobUrlCompleted | ImportJobCartCompleted | ImportJobFileCompleted;
      }

      if (status === 'failed') {
        const failed = data as ImportJobFailed;
        throw new Error(failed.error || t('studio.import.error_generic'));
      }

      if (
        status === 'queued' ||
        status === 'waiting' ||
        status === 'active' ||
        status === 'delayed' ||
        status === 'paused' ||
        status === 'waiting-children'
      ) {
        onStatus?.(status);
        await sleep(1200);
        continue;
      }

      if (!res.ok) {
        throw new Error(t('studio.import.error_generic'));
      }

      await sleep(1200);
    }

    throw new Error(t('studio.vto.timeout') || 'Import timed out.');
  };

  const handleImportSubmit = async () => {
    if (!importUrl.trim()) return;
    setIsProcessing(true);
    try {
      setProcessingStatus(t('studio.import.loading'));
      const queueRes = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: importUrl.trim(),
          name: newItemName,
          category: newItemCategory,
        }),
      });
      const queueData = await queueRes.json();
      if (!queueRes.ok || typeof queueData?.jobId !== 'string') {
        throw new Error(
          typeof queueData?.error === 'string' ? queueData.error : t('studio.import.error_generic')
        );
      }

      const result = await pollImportJob(queueData.jobId, () => {
        setProcessingStatus(t('studio.import.loading'));
      });
      if (result.type !== 'url') {
        throw new Error(t('studio.import.error_generic'));
      }

      const savedAsset = toAsset(result.asset);
      if (savedAsset) {
        setUserAssets((prev) => [savedAsset, ...prev]);
      }
      setIsImportModalOpen(false);
      setImportUrl('');
      setNewItemName('');
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.import.error_generic')));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setIsProcessing(true);
    try {
      setProcessingStatus(t('studio.upload.loading'));
      const formData = new FormData();
      formData.append('type', 'file');
      formData.append('file', uploadFile);
      formData.append('name', newItemName || t('studio.asset.uploaded'));
      formData.append('category', newItemCategory);

      const queueRes = await fetch('/api/import-jobs', {
        method: 'POST',
        body: formData,
      });
      const queueData = await queueRes.json();
      if (!queueRes.ok || typeof queueData?.jobId !== 'string') {
        throw new Error(
          typeof queueData?.error === 'string' ? queueData.error : t('studio.upload.error_generic')
        );
      }

      const result = await pollImportJob(queueData.jobId, () => {
        setProcessingStatus(t('studio.upload.loading'));
      });
      if (result.type !== 'file') {
        throw new Error(t('studio.upload.error_generic'));
      }

      const savedAsset = toAsset(result.asset);
      if (savedAsset) {
        setUserAssets((prev) => [savedAsset, ...prev]);
      }
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadPreview(null);
      setNewItemName('');
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.upload.error_generic')));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const deleteAsset = async (id: string) => {
    if (!confirm(t('studio.asset.delete_confirm') || 'Delete this asset?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setUserAssets((prev) => prev.filter((asset) => asset.id !== id));
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.asset.delete_failed') || 'Failed to delete asset.'));
    }
  };

  const removeTextFromCanvas = (id: string) => {
    setTextItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const rotateSelected = (deg: number) => {
    if (selectedItemId) {
      setCanvasItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId ? { ...item, rotation: (item.rotation + deg) % 360 } : item
        )
      );
      return;
    }

    if (selectedTextId) {
      setTextItems((prev) =>
        prev.map((item) =>
          item.id === selectedTextId ? { ...item, rotation: (item.rotation + deg) % 360 } : item
        )
      );
    }
  };

  const scaleSelected = (factor: number) => {
    if (selectedItemId) {
      setCanvasItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId ? { ...item, scale: Math.max(0.1, item.scale + factor) } : item
        )
      );
      return;
    }

    if (selectedTextId) {
      setTextItems((prev) =>
        prev.map((item) =>
          item.id === selectedTextId ? { ...item, scale: Math.max(0.1, item.scale + factor) } : item
        )
      );
    }
  };

  const resetSelected = () => {
    if (selectedItemId) {
      setCanvasItems((prev) =>
        prev.map((item) => (item.id === selectedItemId ? { ...item, scale: 1, rotation: 0 } : item))
      );
      return;
    }

    if (selectedTextId) {
      setTextItems((prev) =>
        prev.map((item) => (item.id === selectedTextId ? { ...item, scale: 1, rotation: 0 } : item))
      );
    }
  };

  const clearCanvas = () => {
    if (confirm(t('studio.clear_canvas_confirm') || 'Clear the canvas?')) {
      setCanvasItems([]);
      setTextItems([]);
      setSelectedItemId(null);
      setSelectedTextId(null);
    }
  };

  const handleDragEnd = (id: string, offset: { x: number; y: number }) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x: item.x + offset.x, y: item.y + offset.y } : item))
    );
  };

  const handleTextDragEnd = (id: string, offset: { x: number; y: number }) => {
    setTextItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x: item.x + offset.x, y: item.y + offset.y } : item))
    );
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleItemNodeChange = useCallback((id: string, node: HTMLDivElement | null) => {
    itemRefs.current[id] = node;
  }, []);

  const handleTextNodeChange = useCallback((id: string, node: HTMLDivElement | null) => {
    textRefs.current[id] = node;
  }, []);

  const renderCanvasToDataUrl = async () => {
    if (!canvasRef.current) return null;
    const bounds = canvasRef.current.getBoundingClientRect();
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    const canvasFontFamily = window.getComputedStyle(document.body).fontFamily || "sans-serif";

    const sortedItems = [...canvasItems, ...textItems].sort((a, b) => a.zIndex - b.zIndex);

    for (const item of sortedItems) {
      const isText = 'text' in item;
      const el = isText ? textRefs.current[item.id] : itemRefs.current[item.id];
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const cx = rect.left - bounds.left + rect.width / 2;
      const cy = rect.top - bounds.top + rect.height / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.scale, item.scale);

      if (isText) {
        const textItem = item as TextItem;
        ctx.font = `bold ${textItem.fontSize}px ${canvasFontFamily}`;
        ctx.fillStyle = textItem.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textItem.text, 0, 0);
      } else {
        const canvasItem = item as CanvasItem;
        const asset = assetById.get(canvasItem.assetId);
        if (asset) {
          try {
            const img = await loadImage(asset.imageSrc);
            ctx.drawImage(img, -el.offsetWidth / 2, -el.offsetHeight / 2, el.offsetWidth, el.offsetHeight);
          } catch {
            // ignore asset rendering failures during export
          }
        }
      }
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const downloadCanvasAsImage = async () => {
    const imageDataUrl = await renderCanvasToDataUrl();
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.download = `freestyle-${Date.now()}.png`;
    link.href = imageDataUrl;
    link.click();
  };

  const onNewItemCategoryChange = (value: string) => {
    if (isEditableAssetCategory(value)) {
      setNewItemCategory(value);
    }
  };

  const onCartImportCategoryChange = (value: string) => {
    if (isEditableAssetCategory(value)) {
      setCartImportCategory(value);
    }
  };

  const getCanvasAssetItems = () => {
    return canvasItems
      .map((item) => assetById.get(item.assetId))
      .filter((asset): asset is Asset => Boolean(asset))
      .map((asset) => ({
        name: asset.name,
        category: asset.category,
        imageSrc: asset.imageSrc,
      }));
  };

  const handleCartImportSubmit = async () => {
    if (!cartImportUrl.trim()) return;
    setIsCartImporting(true);
    setCartImportStatus(t('studio.cart_import.loading') || 'Importing...');
    try {
      const queueRes = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cart',
          url: cartImportUrl.trim(),
          category: cartImportCategory,
        }),
      });
      const queueData = await queueRes.json();
      if (!queueRes.ok || typeof queueData?.jobId !== 'string') {
        throw new Error(
          typeof queueData?.error === 'string' ? queueData.error : 'Failed to import cart.'
        );
      }

      const result = await pollImportJob(queueData.jobId, () => {
        setCartImportStatus(t('studio.cart_import.loading') || 'Importing...');
      });
      if (result.type !== 'cart') {
        throw new Error(t('studio.cart_import.error_generic') || 'Failed to import cart.');
      }

      const parsedAssets = Array.isArray(result?.assets)
        ? result.assets
            .map((asset: unknown) => toAsset(asset))
            .filter((asset: Asset | null): asset is Asset => Boolean(asset))
        : [];
      if (parsedAssets.length > 0) {
        setUserAssets((prev) => [...parsedAssets, ...prev]);
      }

      if (typeof result?.failedCount === 'number' && result.failedCount > 0) {
        alert(
          `${parsedAssets.length}${t('studio.cart_import.imported_suffix') || ' imported. '} ${result.failedCount}${t('studio.cart_import.failed_suffix') || ' failed.'}`
        );
      }
      setIsCartImportModalOpen(false);
      setCartImportUrl('');
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.cart_import.error_generic') || 'Failed to import cart.'));
    } finally {
      setIsCartImporting(false);
      setCartImportStatus('');
    }
  };

  const handleReviewGenerate = async () => {
    if (canvasItems.length === 0) {
      alert(t('studio.tryon.error_no_items'));
      return;
    }

    setIsReviewLoading(true);
    setReviewRawText(null);
    try {
      const preview = await renderCanvasToDataUrl();
      if (!preview) throw new Error(t('studio.review.error_image'));

      setReviewPreviewImage(preview);
      const payload = {
        imageDataUrl: preview,
        items: getCanvasAssetItems(),
        language: language === 'ko' ? 'Korean' : 'English',
        gender: reviewGender || undefined,
        occasion: reviewOccasion || undefined,
        occasionDetail: reviewOccasionDetail || undefined,
        personalColor: reviewPersonalColor || undefined,
      };

      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : t('studio.review.error_generic'));
      }

      const parsed = normalizeReviewResult(data?.review);
      setReviewResult(parsed);
      setReviewRawText(typeof data?.rawText === 'string' ? data.rawText : null);
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.review.error_generic')));
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleTryOnModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = typeof reader.result === 'string' ? reader.result : null;
      if (!value) return;
      setModelPhotoPreview(value);
      try {
        window.localStorage.setItem('freestyle:model-photo', value);
      } catch {
        // ignore storage failures
      }
    };
    reader.readAsDataURL(file);
  };

  const pollTryOnJob = async (jobId: string) => {
    const maxAttempts = 45;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const res = await fetch(`/api/ai/tryon/${jobId}`);
      const data = await res.json();
      const status = typeof data?.status === 'string' ? data.status : '';

      if (status === 'completed' && typeof data?.imageDataUrl === 'string') {
        return data.imageDataUrl as string;
      }

      if (status === 'failed') {
        throw new Error(typeof data?.error === 'string' ? data.error : t('studio.vto.error_generic'));
      }

      if (!res.ok && status !== 'queued' && status !== 'active' && status !== 'waiting') {
        throw new Error(typeof data?.error === 'string' ? data.error : t('studio.vto.error_generic'));
      }

      await sleep(2000);
    }

    throw new Error(t('studio.vto.timeout') || 'Try-on timed out.');
  };

  const handleTryOnGenerate = async () => {
    if (!modelPhotoPreview) {
      alert(t('studio.tryon.error_no_model'));
      return;
    }
    if (canvasItems.length === 0) {
      alert(t('studio.tryon.error_no_items'));
      return;
    }

    setIsTryOnLoading(true);
    setTryOnError(null);
    setTryOnResultImage(null);
    try {
      const res = await fetch('/api/ai/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelImage: modelPhotoPreview,
          items: getCanvasAssetItems(),
        }),
      });
      const data = await res.json();
      if (!res.ok || typeof data?.jobId !== 'string') {
        throw new Error(typeof data?.error === 'string' ? data.error : t('studio.vto.error_generic'));
      }

      const resultImage = await pollTryOnJob(data.jobId);
      setTryOnResultImage(resultImage);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studio.vto.error_generic'));
      setTryOnError(message);
    } finally {
      setIsTryOnLoading(false);
    }
  };

  const handleTryOnDownload = () => {
    if (!tryOnResultImage) return;
    const link = document.createElement('a');
    link.download = `freestyle-tryon-${Date.now()}.png`;
    link.href = tryOnResultImage;
    link.click();
  };

  const assetLibraryNode = (
    <AssetLibrary
      t={t}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onOpenUploadModal={() => setIsUploadModalOpen(true)}
      onOpenImportModal={() => setIsImportModalOpen(true)}
      onOpenCartImportModal={() => setIsCartImportModalOpen(true)}
      isCategoryMenuOpen={isCategoryMenuOpen}
      onToggleCategoryMenu={() => setIsCategoryMenuOpen((prev) => !prev)}
      onCloseCategoryMenu={() => setIsCategoryMenuOpen(false)}
      activeCategoryLabel={activeCategoryLabel}
      categories={categories}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      filteredAssets={filteredAssets}
      onAddAssetToCanvas={addAssetToCanvas}
      onDeleteAsset={deleteAsset}
    />
  );

  const summaryPanelNode = (
    <SummaryPanel
      t={t}
      canvasItems={canvasItems}
      assetById={assetById}
      selectedItemId={selectedItemId}
      onClose={() => setIsSummaryOpen(false)}
      onRemoveFromCanvas={removeFromCanvas}
      onOpenReviewModal={() => setIsReviewModalOpen(true)}
      onOpenTryOnModal={() => setIsTryOnModalOpen(true)}
      onOpenSaveModal={() => setIsSaveModalOpen(true)}
    />
  );

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-black overflow-hidden">
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden lg:flex w-[320px] bg-white border-r border-black/5 flex-col shrink-0">
          {assetLibraryNode}
        </aside>

        <StudioCanvas
          canvasRef={canvasRef}
          onItemNodeChange={handleItemNodeChange}
          onTextNodeChange={handleTextNodeChange}
          canvasSize={canvasSize}
          customRatio={customRatio}
          onCustomRatioChange={setCustomRatio}
          canvasWidthPercent={canvasWidthPercent}
          onCanvasWidthPercentChange={setCanvasWidthPercent}
          canvasBackground={canvasBackground}
          isSizePickerOpen={isSizePickerOpen}
          isColorPickerOpen={isColorPickerOpen}
          onToggleSizePicker={() => setIsSizePickerOpen((prev) => !prev)}
          onToggleColorPicker={() => setIsColorPickerOpen((prev) => !prev)}
          onCloseSizePicker={() => setIsSizePickerOpen(false)}
          onCloseColorPicker={() => setIsColorPickerOpen(false)}
          onSelectCanvasSize={setCanvasSize}
          onSelectCanvasBackground={setCanvasBackground}
          onOpenTextModal={() => setIsTextModalOpen(true)}
          onRotateSelected={rotateSelected}
          onScaleSelected={scaleSelected}
          onResetSelected={resetSelected}
          onClearCanvas={clearCanvas}
          onDownloadCanvas={downloadCanvasAsImage}
          onOpenSummary={() => setIsSummaryOpen(true)}
          onOpenAssetLibrary={() => setIsAssetLibraryOpen(true)}
          canvasItems={canvasItems}
          textItems={textItems}
          assetById={assetById}
          onSelectItem={selectCanvasItem}
          onSelectText={selectTextItem}
          onDragEnd={handleDragEnd}
          onTextDragEnd={handleTextDragEnd}
          onRemoveItem={removeFromCanvas}
          onRemoveText={removeTextFromCanvas}
        />

        <aside className="hidden xl:flex w-80 bg-white border-l border-black/5 flex-col shrink-0">
          {summaryPanelNode}
        </aside>
      </div>

      <StudioDrawers
        isAssetLibraryOpen={isAssetLibraryOpen}
        onCloseAssetLibrary={() => setIsAssetLibraryOpen(false)}
        assetLibrary={assetLibraryNode}
        isSummaryOpen={isSummaryOpen}
        onCloseSummary={() => setIsSummaryOpen(false)}
        summaryPanel={summaryPanelNode}
      />

      <StudioModals
        t={t}
        isSaveModalOpen={isSaveModalOpen}
        saveTitle={saveTitle}
        onSaveTitleChange={setSaveTitle}
        onCloseSaveModal={() => setIsSaveModalOpen(false)}
        onSaveOutfit={() => {
          alert('Saved!');
          setIsSaveModalOpen(false);
        }}
        isTextModalOpen={isTextModalOpen}
        newTextContent={newTextContent}
        onNewTextContentChange={setNewTextContent}
        onCloseTextModal={() => setIsTextModalOpen(false)}
        onAddTextToCanvas={addTextToCanvas}
        isImportModalOpen={isImportModalOpen}
        importUrl={importUrl}
        onImportUrlChange={setImportUrl}
        newItemName={newItemName}
        onNewItemNameChange={setNewItemName}
        newItemCategory={newItemCategory}
        onNewItemCategoryChange={onNewItemCategoryChange}
        categories={categories}
        isProcessing={isProcessing}
        processingStatus={processingStatus}
        onCloseImportModal={() => setIsImportModalOpen(false)}
        onImportSubmit={handleImportSubmit}
        isCartImportModalOpen={isCartImportModalOpen}
        cartImportUrl={cartImportUrl}
        onCartImportUrlChange={setCartImportUrl}
        cartImportCategory={cartImportCategory}
        onCartImportCategoryChange={onCartImportCategoryChange}
        isCartImporting={isCartImporting}
        cartImportStatus={cartImportStatus}
        onCloseCartImportModal={() => setIsCartImportModalOpen(false)}
        onCartImportSubmit={handleCartImportSubmit}
        isUploadModalOpen={isUploadModalOpen}
        hasUploadFile={Boolean(uploadFile)}
        uploadPreview={uploadPreview}
        onFileChange={onFileChange}
        onCloseUploadModal={() => setIsUploadModalOpen(false)}
        onUploadSubmit={handleUploadSubmit}
        isReviewModalOpen={isReviewModalOpen}
        onCloseReviewModal={() => setIsReviewModalOpen(false)}
        reviewGender={reviewGender}
        onReviewGenderChange={setReviewGender}
        reviewOccasion={reviewOccasion}
        onReviewOccasionChange={setReviewOccasion}
        reviewOccasionDetail={reviewOccasionDetail}
        onReviewOccasionDetailChange={setReviewOccasionDetail}
        reviewPersonalColor={reviewPersonalColor}
        onReviewPersonalColorChange={setReviewPersonalColor}
        isReviewLoading={isReviewLoading}
        reviewPreviewImage={reviewPreviewImage}
        reviewResult={reviewResult}
        reviewRawText={reviewRawText}
        onGenerateReview={handleReviewGenerate}
        isTryOnModalOpen={isTryOnModalOpen}
        onCloseTryOnModal={() => setIsTryOnModalOpen(false)}
        modelPhotoPreview={modelPhotoPreview}
        hasModelPhoto={Boolean(modelPhotoPreview)}
        onTryOnModelChange={handleTryOnModelChange}
        isTryOnLoading={isTryOnLoading}
        tryOnResultImage={tryOnResultImage}
        tryOnError={tryOnError}
        onTryOnGenerate={handleTryOnGenerate}
        onTryOnDownload={handleTryOnDownload}
      />
    </div>
  );
}

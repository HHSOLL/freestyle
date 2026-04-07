'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/auth/AuthGate';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { apiFetch, apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
import { trackAddToCartConversion } from '@/lib/canaryTelemetry';
import { isAuthRequired } from '@/lib/supabaseBrowser';
import { AssetLibrary } from '@/features/studio/components/AssetLibrary';
import { FittingWorkbench } from '@/features/studio/components/FittingWorkbench';
import { StudioCanvas } from '@/features/studio/components/StudioCanvas';
import { StudioDrawers } from '@/features/studio/components/StudioDrawers';
import { MusinsaBridgeModal } from '@/features/studio/components/MusinsaBridgeModal';
import { StudioModals } from '@/features/studio/components/StudioModals';
import { SummaryPanel } from '@/features/studio/components/SummaryPanel';
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_WIDTH_PERCENT,
  DEFAULT_CUSTOM_RATIO,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SIZE,
} from '@/features/studio/constants';
import {
  MUSINSA_BRIDGE_QUERY_PARAM,
  parseMusinsaBridgePayload,
  type MusinsaBridgePayload,
} from '@/features/studio/musinsaBridge';
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

type JobResponse = {
  id?: string;
  status?: string;
  result?: Record<string, unknown> | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

type BatchImportResponse = {
  requested_count?: number;
  queued_count?: number;
  failed_count?: number;
  items?: Array<{
    product_url?: string;
    product_id?: string;
    job_id?: string;
  }>;
  failed?: Array<{
    product_url?: string;
    error_code?: string;
    message?: string;
  }>;
};

type BatchImportItem = {
  product_url: string;
  product_id: string;
  job_id: string;
};

type EvaluationResponse = {
  id: string;
  compatibility_score: number | null;
  explanation: Record<string, unknown> | null;
};

type TryonResponse = {
  id: string;
  output_image_url: string | null;
  status: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BRIDGE_IMPORT_RESOLVE_CONCURRENCY = 4;
const DEFAULT_IMMEDIATE_UPLOAD_CATEGORY: EditableAssetCategory = 'custom';

const toBatchImportItems = (items: BatchImportResponse["items"]): BatchImportItem[] => {
  if (!Array.isArray(items)) return [];

  return items.filter(
    (item): item is BatchImportItem =>
      typeof item?.product_url === 'string' &&
      item.product_url.trim().length > 0 &&
      typeof item.product_id === 'string' &&
      item.product_id.trim().length > 0 &&
      typeof item.job_id === 'string' &&
      item.job_id.trim().length > 0
  );
};

const settleWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> => {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        const value = await worker(items[index], index);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

const buildBridgeImportIdempotencyKey = (payload: MusinsaBridgePayload) => `musinsa-bridge:${payload.capturedAt}`;
const formatBridgeImportStatus = (label: string, completed: number, total: number) =>
  total > 0 ? `${label} ${Math.min(completed, total)}/${total}` : label;

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

class ImportJobFailureError extends Error {
  code?: string;
  candidates: ImportImageCandidate[];

  constructor(message: string, details: { code?: string; candidates?: ImportImageCandidate[] }) {
    super(message);
    this.name = 'ImportJobFailureError';
    this.code = details.code;
    this.candidates = details.candidates ?? [];
  }
}

const toImportImageCandidate = (value: unknown): ImportImageCandidate | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.url !== 'string' || record.url.trim().length === 0) return null;
  if (typeof record.source !== 'string') return null;
  const finalScore =
    typeof record.finalScore === 'number' && Number.isFinite(record.finalScore)
      ? record.finalScore
      : typeof record.score === 'number' && Number.isFinite(record.score)
        ? record.score
        : null;
  if (finalScore === null) return null;
  if (typeof record.width !== 'number' || !Number.isFinite(record.width) || record.width <= 0) return null;
  if (typeof record.height !== 'number' || !Number.isFinite(record.height) || record.height <= 0) return null;
  const trimmedUrl = record.url.trim();
  const id =
    typeof record.id === 'string' && record.id.trim().length > 0
      ? record.id.trim()
      : `${record.source}:${trimmedUrl}:${record.width}x${record.height}`;
  return {
    id,
    url: trimmedUrl,
    source: record.source,
    finalScore,
    width: record.width,
    height: record.height,
    isModelLike: Boolean(record.isModelLike),
    facesOverMinArea:
      typeof record.facesOverMinArea === 'number' && Number.isFinite(record.facesOverMinArea)
        ? record.facesOverMinArea
        : 0,
  };
};

const dedupeImportCandidates = (candidates: ImportImageCandidate[]) => {
  const unique = new Map<string, ImportImageCandidate>();
  for (const candidate of candidates) {
    if (!candidate.url) continue;
    if (!unique.has(candidate.url)) {
      unique.set(candidate.url, candidate);
    }
  }
  return Array.from(unique.values());
};

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const extractClipboardImageFile = (event: ClipboardEvent) => {
  const items = Array.from(event.clipboardData?.items ?? []);
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
};

const createFileFromDataUrl = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('Failed to prepare image upload.');
  }

  const blob = await response.blob();
  return new File([blob], fileName, {
    type: blob.type || 'image/png',
  });
};

export default function StudioPage() {
  const { t, language } = useLanguage();
  const { isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const authRequired = isAuthRequired();
  const canAccessStudio = !authRequired || Boolean(user);

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
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
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
  const [isImportCandidateModalOpen, setIsImportCandidateModalOpen] = useState(false);
  const [importCandidates, setImportCandidates] = useState<ImportImageCandidate[]>([]);
  const [selectedImportCandidateUrl, setSelectedImportCandidateUrl] = useState('');
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
  const [bridgePayload, setBridgePayload] = useState<MusinsaBridgePayload | null>(null);
  const [isBridgeImportModalOpen, setIsBridgeImportModalOpen] = useState(false);
  const [bridgeImportCategory, setBridgeImportCategory] = useState<EditableAssetCategory>('custom');
  const [isBridgeImporting, setIsBridgeImporting] = useState(false);
  const [bridgeImportStatus, setBridgeImportStatus] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [isFittingModalOpen, setIsFittingModalOpen] = useState(false);
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
  const handledBridgePayloadRef = useRef<string | null>(null);
  const uploadImportInFlightRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || !canAccessStudio) return;
    const loadAssets = async () => {
      try {
        const { response, data } = await apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>(
          '/v1/assets?status=ready&page=1&page_size=200'
        );
        const source = Array.isArray(data?.items) ? data.items : Array.isArray(data?.assets) ? data.assets : null;
        if (response.ok && source) {
          const parsedAssets = source
            .map((asset: unknown) => toAsset(asset))
            .filter((asset: Asset | null): asset is Asset => Boolean(asset));
          setUserAssets(parsedAssets);
        }
      } catch {
        // ignore read errors in local development
      }
    };
    loadAssets();
  }, [canAccessStudio, isAuthLoading]);

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

  useEffect(() => {
    const raw = new URL(window.location.href).searchParams.get(MUSINSA_BRIDGE_QUERY_PARAM);
    if (!raw || handledBridgePayloadRef.current === raw) return;

    handledBridgePayloadRef.current = raw;
    const parsed = parseMusinsaBridgePayload(raw);
    if (!parsed) {
      router.replace('/studio', { scroll: false });
      return;
    }

    setBridgePayload(parsed);
    setBridgeImportCategory('custom');
    setIsBridgeImportModalOpen(true);
    setIsImportModalOpen(false);
    setIsImportCandidateModalOpen(false);
    setIsCartImportModalOpen(false);

    const cleanupUrl = new URL(window.location.href);
    cleanupUrl.searchParams.delete(MUSINSA_BRIDGE_QUERY_PARAM);
    router.replace(`${cleanupUrl.pathname}${cleanupUrl.search}${cleanupUrl.hash}`, { scroll: false });
  }, [router]);

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

  const registerImportedAsset = useCallback((savedAsset: Asset) => {
    setUserAssets((prev) => [savedAsset, ...prev]);
  }, []);

  const clearUploadDraft = useCallback(() => {
    setUploadFile(null);
    setUploadPreview(null);
    setNewItemName('');
  }, []);

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

  const pollJobUntilTerminal = useCallback(async (
    jobId: string,
    fallbackMessage: string,
    onStatus?: (status: string) => void
  ): Promise<JobResponse> => {
    const maxAttempts = 180;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { response, data } = await apiFetchJson<JobResponse>(`/v1/jobs/${jobId}`);
      const job = isRecord(data) ? (data as JobResponse) : null;
      const status = typeof job?.status === 'string' ? job.status : '';

      if (status === 'succeeded') {
        return job as JobResponse;
      }

      if (status === 'failed' || status === 'cancelled') {
        const resultRecord = isRecord(job?.result) ? job.result : null;
        const candidates = Array.isArray(resultRecord?.candidates)
          ? resultRecord.candidates
              .map((candidate: unknown) => toImportImageCandidate(candidate))
              .filter((candidate: ImportImageCandidate | null): candidate is ImportImageCandidate =>
                Boolean(candidate)
              )
          : [];
        throw new ImportJobFailureError(job?.error?.message || fallbackMessage, {
          code: job?.error?.code,
          candidates,
        });
      }

      if (status === 'queued' || status === 'processing') {
        onStatus?.(status);
        await sleep(1200);
        continue;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, fallbackMessage));
      }

      await sleep(1200);
    }

    throw new Error(t('studio.vto.timeout') || 'Import timed out.');
  }, [t]);

  const fetchAssetById = useCallback(async (assetId: string) => {
    const { response, data } = await apiFetchJson<unknown>(`/v1/assets/${assetId}`);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, t('studio.import.error_generic')));
    }

    const asset = toAsset(data);
    if (!asset) {
      throw new Error(t('studio.import.error_generic'));
    }
    return asset;
  }, [t]);

  const updateAssetInState = useCallback((nextAsset: Asset) => {
    setUserAssets((prev) => prev.map((asset) => (asset.id === nextAsset.id ? nextAsset : asset)));
  }, []);

  const handleSaveAssetMetadata = useCallback(
    async (
      assetId: string,
      patch: {
        measurements: NonNullable<Asset['metadata']>['measurements'];
        fitProfile: NonNullable<Asset['metadata']>['fitProfile'];
      }
    ) => {
      const { response, data } = await apiFetchJson<unknown>(`/v1/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            measurements: patch.measurements,
            fitProfile: patch.fitProfile,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to save fitting metadata.'));
      }

      const updatedAsset = toAsset(data);
      if (!updatedAsset) {
        throw new Error('Failed to parse updated asset.');
      }

      updateAssetInState(updatedAsset);
    },
    [updateAssetInState]
  );

  const resolveAssetPipeline = useCallback(async (
    initialJobId: string,
    fallbackMessage: string,
    onStatus?: (status: string) => void
  ) => {
    let currentJob = await pollJobUntilTerminal(initialJobId, fallbackMessage, onStatus);
    let currentResult = isRecord(currentJob.result) ? currentJob.result : null;
    const assetId = typeof currentResult?.asset_id === 'string' ? currentResult.asset_id : null;

    if (!assetId) {
      throw new Error(fallbackMessage);
    }

    let nextJobId = typeof currentResult?.next_job_id === 'string' ? currentResult.next_job_id : null;
    while (nextJobId) {
      currentJob = await pollJobUntilTerminal(nextJobId, fallbackMessage, onStatus);
      currentResult = isRecord(currentJob.result) ? currentJob.result : null;
      nextJobId = typeof currentResult?.next_job_id === 'string' ? currentResult.next_job_id : null;
    }

    return fetchAssetById(assetId);
  }, [fetchAssetById, pollJobUntilTerminal]);

  const runUrlImport = useCallback(async (
    productUrl: string,
    categoryHint: EditableAssetCategory,
    candidateUrl?: string
  ) => {
    const { response, data } = await apiFetchJson<{ job_id?: string }>('/v1/jobs/import/product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_url: productUrl,
        category_hint: categoryHint,
        item_name: newItemName.trim() || undefined,
        selected_image_url: candidateUrl,
      }),
    });

    if (!response.ok || typeof data?.job_id !== 'string') {
      throw new Error(getApiErrorMessage(data, t('studio.import.error_generic')));
    }

    return resolveAssetPipeline(data.job_id, t('studio.import.error_generic'), () => {
      setProcessingStatus(t('studio.import.loading'));
    });
  }, [newItemName, resolveAssetPipeline, t]);

  const finalizeImportedUrlAsset = (savedAsset: Asset) => {
    registerImportedAsset(savedAsset);
    setIsImportCandidateModalOpen(false);
    setImportCandidates([]);
    setSelectedImportCandidateUrl('');
    setIsImportModalOpen(false);
    setImportUrl('');
    setNewItemName('');
  };

  const handleImportSubmit = async () => {
    if (!importUrl.trim()) return;
    setIsProcessing(true);
    try {
      setProcessingStatus(t('studio.import.loading'));
      const asset = await runUrlImport(importUrl.trim(), newItemCategory);
      finalizeImportedUrlAsset(asset);
    } catch (error: unknown) {
      const canPromptManualCandidateSelection =
        error instanceof ImportJobFailureError &&
        error.code === 'CANDIDATE_SELECTION_REQUIRED' &&
        dedupeImportCandidates(error.candidates).length > 0;

      if (canPromptManualCandidateSelection && error instanceof ImportJobFailureError) {
        const dedupedCandidates = dedupeImportCandidates(error.candidates);
        setImportCandidates(dedupedCandidates);
        setSelectedImportCandidateUrl(dedupedCandidates[0]?.url ?? '');
        setIsImportModalOpen(false);
        setIsImportCandidateModalOpen(true);
      } else {
        alert(getErrorMessage(error, t('studio.import.error_generic')));
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleImportWithSelectedCandidate = async () => {
    if (!selectedImportCandidateUrl.trim() || !importUrl.trim()) return;
    setIsProcessing(true);
    try {
      setProcessingStatus(t('studio.import.loading'));
      const asset = await runUrlImport(importUrl.trim(), newItemCategory, selectedImportCandidateUrl.trim());
      finalizeImportedUrlAsset(asset);
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.import.error_generic')));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const closeImportModals = () => {
    setIsImportModalOpen(false);
    setIsImportCandidateModalOpen(false);
    setImportCandidates([]);
    setSelectedImportCandidateUrl('');
  };

  const uploadFileThroughImportPipeline = useCallback(
    async (
      file: File,
      options?: {
        categoryHint?: EditableAssetCategory;
        itemName?: string;
        closeUploadModalOnSuccess?: boolean;
        clearUploadDraftOnSuccess?: boolean;
      }
    ) => {
      if (isProcessing || uploadImportInFlightRef.current) {
        throw new Error(t('studio.upload.loading') || 'Upload already in progress.');
      }

      uploadImportInFlightRef.current = true;
      setIsProcessing(true);
      try {
        setProcessingStatus(t('studio.upload.loading'));
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('category_hint', options?.categoryHint ?? newItemCategory);
        const itemName = options?.itemName?.trim() || newItemName.trim();
        if (itemName) {
          formData.append('item_name', itemName);
        }

        const queueRes = await apiFetch('/v1/jobs/import/upload', {
          method: 'POST',
          body: formData,
        });
        const queueData = (await queueRes.json()) as { job_id?: string; error?: string; message?: string };
        if (!queueRes.ok || typeof queueData?.job_id !== 'string') {
          throw new Error(getApiErrorMessage(queueData, t('studio.upload.error_generic')));
        }

        const savedAsset = await resolveAssetPipeline(queueData.job_id, t('studio.upload.error_generic'), () => {
          setProcessingStatus(t('studio.upload.loading'));
        });
        registerImportedAsset(savedAsset);

        if (options?.closeUploadModalOnSuccess) {
          setIsUploadModalOpen(false);
        }
        if (options?.clearUploadDraftOnSuccess) {
          clearUploadDraft();
        }

        return savedAsset;
      } finally {
        uploadImportInFlightRef.current = false;
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [clearUploadDraft, isProcessing, newItemCategory, newItemName, registerImportedAsset, resolveAssetPipeline, t]
  );

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    try {
      await uploadFileThroughImportPipeline(uploadFile, {
        closeUploadModalOnSuccess: true,
        clearUploadDraftOnSuccess: true,
      });
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.upload.error_generic')));
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
      const { response, data } = await apiFetchJson<Record<string, unknown>>(`/v1/assets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to delete'));
      }
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

  const renderCanvasToDataUrl = useCallback(async () => {
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
  }, [assetById, canvasBackground, canvasItems, textItems]);

  const saveOutfit = useCallback(async () => {
    if (canvasItems.length === 0) {
      setSaveErrorMessage(t('studio.save.error') || 'Failed to save the outfit.');
      return;
    }

    try {
      setIsSavingOutfit(true);
      setSaveErrorMessage(null);

      const previewImage = await renderCanvasToDataUrl();
      if (!previewImage) {
        throw new Error('Failed to render outfit preview.');
      }

      const items = canvasItems
        .map((item) => {
          const asset = assetById.get(item.assetId);
          if (!asset) return null;
          return {
            id: item.id,
            assetId: asset.id,
            name: asset.name,
            brand: asset.brand ?? null,
            category: asset.category,
            imageSrc: asset.imageSrc,
            sourceUrl: asset.sourceUrl ?? null,
            x: item.x,
            y: item.y,
            scale: item.scale,
            rotation: item.rotation,
            zIndex: item.zIndex,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const outfitData = {
        items,
        textItems: textItems.map((item) => ({
          id: item.id,
          text: item.text,
          x: item.x,
          y: item.y,
          fontSize: item.fontSize,
          color: item.color,
          scale: item.scale,
          rotation: item.rotation,
          zIndex: item.zIndex,
        })),
        canvas: {
          background: canvasBackground,
          size: canvasSize,
          customRatio,
          widthPercent: canvasWidthPercent,
        },
        modelPhoto: modelPhotoPreview ?? null,
      };

      const { response, data } = await apiFetchJson<{ id?: string; shareSlug?: string; error?: string; message?: string }>(
        '/v1/outfits',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            title: saveTitle.trim() || t('studio.save.default_title') || 'Outfit',
            previewImage,
            data: outfitData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, t('studio.save.error') || 'Failed to save the outfit.'));
      }

      setIsSaveModalOpen(false);
      setSaveTitle('');
      router.push('/app/profile');
    } catch (error) {
      setSaveErrorMessage(getErrorMessage(error, t('studio.save.error') || 'Failed to save the outfit.'));
    } finally {
      setIsSavingOutfit(false);
    }
  }, [
    assetById,
    canvasBackground,
    canvasItems,
    canvasSize,
    canvasWidthPercent,
    customRatio,
    modelPhotoPreview,
    renderCanvasToDataUrl,
    router,
    saveTitle,
    t,
    textItems,
  ]);

  const downloadCanvasAsImage = async () => {
    const imageDataUrl = await renderCanvasToDataUrl();
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.download = `freestyle-${Date.now()}.png`;
    link.href = imageDataUrl;
    link.click();
  };

  const handleSnapshotToAsset = useCallback(async () => {
    if (canvasItems.length === 0 && textItems.length === 0) {
      alert(t('studio.tryon.error_no_items') || 'Add something to the canvas first.');
      return;
    }

    try {
      const imageDataUrl = await renderCanvasToDataUrl();
      if (!imageDataUrl) {
        throw new Error(t('studio.upload.error_generic'));
      }

      const snapshotFile = await createFileFromDataUrl(
        imageDataUrl,
        `freestyle-canvas-snapshot-${Date.now()}.png`
      );
      await uploadFileThroughImportPipeline(snapshotFile, {
        categoryHint: DEFAULT_IMMEDIATE_UPLOAD_CATEGORY,
        itemName: t('studio.snapshot.asset_name') || 'Canvas Snapshot',
      });
    } catch (error: unknown) {
      alert(getErrorMessage(error, t('studio.upload.error_generic')));
    }
  }, [canvasItems.length, renderCanvasToDataUrl, t, textItems.length, uploadFileThroughImportPipeline]);

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

  useEffect(() => {
    if (isAuthLoading || !canAccessStudio) return;

    const handlePaste = (event: ClipboardEvent) => {
      const imageFile = extractClipboardImageFile(event);
      if (!imageFile) return;

      event.preventDefault();
      void uploadFileThroughImportPipeline(imageFile, {
        categoryHint: DEFAULT_IMMEDIATE_UPLOAD_CATEGORY,
        itemName: t('studio.paste.asset_name') || 'Clipboard Image',
      }).catch((error: unknown) => {
        alert(getErrorMessage(error, t('studio.upload.error_generic')));
      });
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [canAccessStudio, isAuthLoading, t, uploadFileThroughImportPipeline]);

  if (isAuthLoading) {
    return <div className="min-h-[calc(100vh-4rem)] bg-[#f7f7f5]" />;
  }

  if (!canAccessStudio) {
    return (
      <AuthGate
        title="Studio Access"
        description="에셋 가져오기, 코디 요약, 가상 피팅은 로그인 세션이 있어야 실행됩니다."
        nextPath="/studio"
      />
    );
  }

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
      const { response, data } = await apiFetchJson<{ job_id?: string }>('/v1/jobs/import/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_url: cartImportUrl.trim(),
          max_items: 20,
        }),
      });
      if (!response.ok || typeof data?.job_id !== 'string') {
        throw new Error(getApiErrorMessage(data, 'Failed to import cart.'));
      }

      const parentJob = await pollJobUntilTerminal(
        data.job_id,
        t('studio.cart_import.error_generic') || 'Failed to import cart.',
        () => {
          setCartImportStatus(t('studio.cart_import.loading') || 'Importing...');
        }
      );
      const parentResult = isRecord(parentJob.result) ? parentJob.result : null;
      const childJobIds = Array.isArray(parentResult?.child_job_ids)
        ? parentResult.child_job_ids.filter((value): value is string => typeof value === 'string')
        : [];

      if (childJobIds.length === 0) {
        throw new Error(t('studio.cart_import.error_generic') || 'Failed to import cart.');
      }

      const settled = await Promise.allSettled(
        childJobIds.map((childJobId) =>
          resolveAssetPipeline(childJobId, t('studio.cart_import.error_generic') || 'Failed to import cart.', () => {
            setCartImportStatus(t('studio.cart_import.loading') || 'Importing...');
          })
        )
      );

      const parsedAssets = settled
        .filter((item): item is PromiseFulfilledResult<Asset> => item.status === 'fulfilled')
        .map((item) => item.value);

      if (parsedAssets.length > 0) {
        setUserAssets((prev) => [...parsedAssets, ...prev]);
      }

      const failedCount = settled.length - parsedAssets.length;
      if (parsedAssets.length > 0) {
        trackAddToCartConversion({
          source: 'studio_cart_import',
          imported_count: parsedAssets.length,
          failed_count: failedCount,
          category: cartImportCategory,
        });
      }
      if (failedCount > 0) {
        alert(
          `${parsedAssets.length}${t('studio.cart_import.imported_suffix') || ' imported. '} ${failedCount}${t('studio.cart_import.failed_suffix') || ' failed.'}`
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

  const handleBridgeImportSubmit = async () => {
    if (!bridgePayload?.items.length) return;

    const productUrls = bridgePayload.items.map((item) => item.url);
    const loadingLabel = t('studio.bridge.loading') || 'Importing...';
    const fallbackMessage = t('studio.bridge.error_generic') || 'Could not import products from Musinsa.';

    setIsBridgeImporting(true);
    setBridgeImportStatus(loadingLabel);

    try {
      const { response, data } = await apiFetchJson<BatchImportResponse>('/v1/jobs/import/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_urls: productUrls,
          category_hint: bridgeImportCategory,
          idempotency_key: buildBridgeImportIdempotencyKey(bridgePayload),
        }),
      });

      const queuedItems = toBatchImportItems(data?.items);
      if (!response.ok || queuedItems.length === 0) {
        throw new Error(getApiErrorMessage(data, fallbackMessage));
      }

      let completedCount = 0;
      setBridgeImportStatus(formatBridgeImportStatus(loadingLabel, completedCount, queuedItems.length));

      const settled = await settleWithConcurrency(
        queuedItems,
        BRIDGE_IMPORT_RESOLVE_CONCURRENCY,
        async (item) => {
          try {
            return await resolveAssetPipeline(item.job_id, fallbackMessage);
          } finally {
            completedCount += 1;
            setBridgeImportStatus(formatBridgeImportStatus(loadingLabel, completedCount, queuedItems.length));
          }
        }
      );

      const parsedAssets = settled
        .filter((item): item is PromiseFulfilledResult<Asset> => item.status === 'fulfilled')
        .map((item) => item.value);

      if (parsedAssets.length > 0) {
        setUserAssets((prev) => [...parsedAssets, ...prev]);
      }

      const queuedFailureCount =
        typeof data?.failed_count === 'number' ? data.failed_count : Math.max(0, productUrls.length - queuedItems.length);
      const processingFailureCount = settled.length - parsedAssets.length;
      const failedCount = queuedFailureCount + processingFailureCount;

      setIsBridgeImportModalOpen(false);
      setBridgePayload(null);
      alert(
        `${parsedAssets.length}${t('studio.bridge.imported_suffix') || ' products imported.'} ${failedCount}${
          t('studio.bridge.failed_suffix') || ' products failed.'
        }`
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error, fallbackMessage));
    } finally {
      setIsBridgeImporting(false);
      setBridgeImportStatus('');
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

      const createResponse = await apiFetchJson<{ job_id?: string; evaluation_id?: string }>('/v1/jobs/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_payload: payload,
        }),
      });
      if (
        !createResponse.response.ok ||
        typeof createResponse.data?.job_id !== 'string' ||
        typeof createResponse.data?.evaluation_id !== 'string'
      ) {
        throw new Error(getApiErrorMessage(createResponse.data, t('studio.review.error_generic')));
      }

      await pollJobUntilTerminal(createResponse.data.job_id, t('studio.review.error_generic'));
      const evaluationResponse = await apiFetchJson<EvaluationResponse>(
        `/v1/evaluations/${createResponse.data.evaluation_id}`
      );
      if (!evaluationResponse.response.ok || !evaluationResponse.data) {
        throw new Error(getApiErrorMessage(evaluationResponse.data, t('studio.review.error_generic')));
      }

      const explanation = isRecord(evaluationResponse.data.explanation) ? evaluationResponse.data.explanation : null;
      const parsed = normalizeReviewResult({
        ...(explanation || {}),
        overallScore:
          evaluationResponse.data.compatibility_score ??
          (typeof explanation?.overallScore === 'number' ? explanation.overallScore : undefined),
        mood:
          typeof explanation?.mood === 'string'
            ? explanation.mood
            : typeof explanation?.score_band === 'string'
              ? explanation.score_band
              : undefined,
        itemBreakdown: Array.isArray(explanation?.itemBreakdown)
          ? explanation.itemBreakdown.filter((item): item is string => typeof item === 'string')
          : Array.isArray(explanation?.details)
            ? explanation.details.filter((item): item is string => typeof item === 'string')
            : undefined,
      });
      setReviewResult(parsed);
      setReviewRawText(explanation ? JSON.stringify(explanation, null, 2) : null);
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

  const getPrimaryCanvasAssetId = () => {
    if (selectedItemId) {
      const selected = canvasItems.find((item) => item.id === selectedItemId);
      if (selected) return selected.assetId;
    }

    return canvasItems[0]?.assetId ?? null;
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

    const primaryAssetId = getPrimaryCanvasAssetId();
    if (!primaryAssetId) {
      alert(t('studio.tryon.error_no_items'));
      return;
    }

    setIsTryOnLoading(true);
    setTryOnError(null);
    setTryOnResultImage(null);
    try {
      const createResponse = await apiFetchJson<{ job_id?: string; tryon_id?: string }>('/v1/jobs/tryons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: primaryAssetId,
          input_image_url: modelPhotoPreview,
        }),
      });
      if (
        !createResponse.response.ok ||
        typeof createResponse.data?.job_id !== 'string' ||
        typeof createResponse.data?.tryon_id !== 'string'
      ) {
        throw new Error(getApiErrorMessage(createResponse.data, t('studio.vto.error_generic')));
      }

      await pollJobUntilTerminal(createResponse.data.job_id, t('studio.vto.error_generic'));
      const tryonResponse = await apiFetchJson<TryonResponse>(`/v1/tryons/${createResponse.data.tryon_id}`);
      if (!tryonResponse.response.ok || !tryonResponse.data?.output_image_url) {
        throw new Error(getApiErrorMessage(tryonResponse.data, t('studio.vto.error_generic')));
      }

      setTryOnResultImage(tryonResponse.data.output_image_url);
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-black/5 bg-[#f4ecdf] px-5 py-4">
        <button
          type="button"
          onClick={() => {
            void handleSnapshotToAsset();
          }}
          disabled={isProcessing}
          className="flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/40"
        >
          {t('studio.snapshot.button') || 'Snapshot -> Asset'}
        </button>
        <p className="mt-2 text-[11px] font-medium leading-5 text-black/60">
          {t('studio.paste.hint') || 'Paste an image anywhere in Studio to import it instantly.'}
        </p>
      </div>
      <div className="min-h-0 flex-1">
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
      </div>
    </div>
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
      onOpenFittingModal={() => setIsFittingModalOpen(true)}
      onOpenSaveModal={() => {
        setSaveErrorMessage(null);
        setIsSaveModalOpen(true);
      }}
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
          productLinkLabel={t('studio.asset.link.open') || 'Open product link'}
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
        language={language}
        isSaveModalOpen={isSaveModalOpen}
        saveTitle={saveTitle}
        isSavingOutfit={isSavingOutfit}
        saveErrorMessage={saveErrorMessage}
        onSaveTitleChange={setSaveTitle}
        onCloseSaveModal={() => {
          setSaveErrorMessage(null);
          setIsSaveModalOpen(false);
        }}
        onSaveOutfit={() => {
          void saveOutfit();
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
        onCloseImportModal={closeImportModals}
        onImportSubmit={handleImportSubmit}
        isImportCandidateModalOpen={isImportCandidateModalOpen}
        importCandidates={importCandidates}
        selectedImportCandidateUrl={selectedImportCandidateUrl}
        onSelectedImportCandidateUrlChange={setSelectedImportCandidateUrl}
        onCloseImportCandidateModal={closeImportModals}
        onImportWithSelectedCandidate={handleImportWithSelectedCandidate}
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
        canvasItems={canvasItems}
        assetById={assetById}
        selectedItemId={selectedItemId}
        modelPhotoPreview={modelPhotoPreview}
        hasModelPhoto={Boolean(modelPhotoPreview)}
        onTryOnModelChange={handleTryOnModelChange}
        isTryOnLoading={isTryOnLoading}
        tryOnResultImage={tryOnResultImage}
        tryOnError={tryOnError}
        onTryOnGenerate={handleTryOnGenerate}
        onTryOnDownload={handleTryOnDownload}
      />

      {isFittingModalOpen ? (
        <FittingWorkbench
          t={t}
          assets={assets}
          initialAssetIds={Array.from(new Set(canvasItems.map((item) => item.assetId)))}
          onClose={() => setIsFittingModalOpen(false)}
          onSaveAssetMetadata={handleSaveAssetMetadata}
        />
      ) : null}

      <MusinsaBridgeModal
        t={t}
        isOpen={isBridgeImportModalOpen}
        payload={bridgePayload}
        categories={categories}
        selectedCategory={bridgeImportCategory}
        onSelectedCategoryChange={(value) => {
          if (isEditableAssetCategory(value)) {
            setBridgeImportCategory(value);
          }
        }}
        isImporting={isBridgeImporting}
        importStatus={bridgeImportStatus}
        onClose={() => {
          setIsBridgeImportModalOpen(false);
          setBridgePayload(null);
          setBridgeImportStatus('');
        }}
        onImport={handleBridgeImportSubmit}
      />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { ArrowRight, ExternalLink, Loader2, RefreshCcw, Ruler, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { getClosetCategoryLabel, getWardrobeSourceLabel } from '@/features/renewal-app/data';
import type { Asset, GarmentFitProfile, GarmentMeasurements } from '@/features/studio/types';
import { toAsset } from '@/features/studio/utils';
import { apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
import { useLanguage } from '@/lib/LanguageContext';
import { buildFittingLayers, defaultBodyProfile, type BodyProfile } from './fitting';

const MannequinScene3D = dynamic(
  () => import('./MannequinScene3D').then((module) => module.MannequinScene3D),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-black/5" /> }
);

const bodyStorageKey = 'freestyle:mannequin-body-profile';

const bodyFields: Array<{ key: keyof BodyProfile; label: string; min: number; max: number }> = [
  { key: 'heightCm', label: 'Height', min: 145, max: 205 },
  { key: 'shoulderCm', label: 'Shoulder', min: 34, max: 60 },
  { key: 'chestCm', label: 'Chest', min: 72, max: 140 },
  { key: 'waistCm', label: 'Waist', min: 54, max: 132 },
  { key: 'hipCm', label: 'Hip', min: 74, max: 150 },
  { key: 'inseamCm', label: 'Inseam', min: 62, max: 98 },
];

const measurementFields: Array<{ key: keyof GarmentMeasurements; label: string }> = [
  { key: 'shoulderCm', label: 'Shoulder' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'waistCm', label: 'Waist' },
  { key: 'hipCm', label: 'Hip' },
  { key: 'sleeveLengthCm', label: 'Sleeve' },
  { key: 'lengthCm', label: 'Length' },
  { key: 'inseamCm', label: 'Inseam' },
  { key: 'hemCm', label: 'Hem' },
];

const fitProfileDefaults: GarmentFitProfile = {
  silhouette: 'regular',
  layer: 'mid',
  structure: 'balanced',
  stretch: 0.2,
  drape: 0.5,
};

const readSavedBodyProfile = () => {
  try {
    const raw = window.localStorage.getItem(bodyStorageKey);
    if (!raw) return defaultBodyProfile;
    return {
      ...defaultBodyProfile,
      ...(JSON.parse(raw) as Partial<BodyProfile>),
    };
  } catch {
    return defaultBodyProfile;
  }
};

const ensureUniqueAssets = (assets: Asset[]) => {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
};

const uniqueIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const formatMeasurementLine = (label: string, value: number | undefined) =>
  typeof value === 'number' ? `${label} ${value} cm` : null;

type ClosetItemFittingLabProps = {
  assetId?: string;
  compact?: boolean;
};

export function ClosetItemFittingLab({ assetId, compact = false }: ClosetItemFittingLabProps) {
  const { language } = useLanguage();
  const focusAssetId = assetId?.trim() ? assetId.trim() : null;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeAssetIds, setActiveAssetIds] = useState<string[]>(focusAssetId ? [focusAssetId] : []);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(focusAssetId ?? '');
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(defaultBodyProfile);
  const [draftMeasurements, setDraftMeasurements] = useState<GarmentMeasurements>({});
  const [draftFitProfile, setDraftFitProfile] = useState<GarmentFitProfile>(fitProfileDefaults);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const deferredBodyProfile = useDeferredValue(bodyProfile);

  const copy =
    language === 'ko'
      ? {
          eyebrow: '옷장 / 피팅 랩',
          title: '3D 마네킹 피팅 랩',
          description:
            '선택한 옷장 아이템을 중심으로 다른 에셋을 겹쳐 입히고, 마네킹 치수를 조정하고, 부족한 실측값을 바로 보정할 수 있습니다.',
          workspaceEyebrow: '옷장 워크스페이스',
          workspaceTitle: '왼쪽 에셋 레일과 3D 마네킹 스테이지를 한 화면에서 다룹니다.',
          workspaceDescription:
            '옷장에 들어오자마자 에셋을 고르고, 레이어를 쌓고, 커스텀 마네킹에 바로 입혀보는 구조로 바꿨습니다.',
          loading: '피팅 랩을 준비하는 중...',
          loadError: '피팅 랩을 불러오지 못했습니다.',
          saveError: '피팅 메타데이터를 저장하지 못했습니다.',
          retry: '다시 시도',
          openStudio: '캔버스 열기',
          source: '소스',
          sourceLink: '원본 링크 열기',
          cutout: '누끼 상태',
          cutoutReady: '배경 제거 완료',
          cutoutFallback: '원본 이미지를 사용 중',
          mannequin: '마네킹',
          mannequinHint: '드래그로 회전하고 확대해 실루엣과 드레이프를 확인하세요.',
          stageHint: '에셋 카드를 눌러 레이어를 켜고 끄며 핏을 비교합니다.',
          garmentSet: '마네킹에 입힌 에셋',
          library: '옷장 에셋',
          libraryHint: '좌측 라이브러리에서 에셋을 바로 선택하고 스테이지에 겹쳐 입힙니다.',
          measurements: '치수 보정',
          fitProfile: '핏 프로필',
          summaries: '핏 요약',
          save: '피팅 메타데이터 저장',
          saving: '저장 중...',
          search: '에셋 검색',
          allCategories: '전체 카테고리',
          empty: '현재 필터에 맞는 에셋이 없습니다.',
          emptyCloset: '아직 옷장 에셋이 없습니다. 캔버스에서 링크나 업로드를 가져오면 여기서 바로 마네킹에 입혀볼 수 있습니다.',
          emptySelection: '왼쪽에서 에셋을 선택하면 치수와 핏 프로필을 조절할 수 있습니다.',
          noFitAsset: '마네킹에 에셋을 하나 이상 추가하면 여기서 핏 보정을 저장할 수 있습니다.',
          body: '바디 치수',
          resetBody: '기본 체형',
          selectedGarment: '선택한 의류',
          live: '실시간 반영',
          missingMeasurements: '실측값이 비어 있으면 이미지 비율과 카테고리 기본값으로 먼저 추정합니다.',
          layerCount: (count: number) => `${count}개 레이어`,
        }
      : {
          eyebrow: 'Closet / Fitting Lab',
          title: 'Real-time 3D Mannequin Lab',
          description:
            'Dress the selected closet item with other wardrobe assets, adjust the mannequin measurements, and correct missing garment data live.',
          workspaceEyebrow: 'Closet Workspace',
          workspaceTitle: 'Keep the asset rail and 3D mannequin stage in the same view.',
          workspaceDescription:
            'The closet now opens as an immediate workspace: pick assets, stack layers, and fit them on the custom mannequin without a dashboard detour.',
          loading: 'Preparing the fitting lab...',
          loadError: 'Failed to load the fitting lab.',
          saveError: 'Failed to save fitting metadata.',
          retry: 'Retry',
          openStudio: 'Open canvas',
          source: 'Source',
          sourceLink: 'Open source link',
          cutout: 'Cutout status',
          cutoutReady: 'Background removed',
          cutoutFallback: 'Using original image',
          mannequin: 'Mannequin',
          mannequinHint: 'Drag to rotate and zoom so you can inspect silhouette, drape, and hem placement.',
          stageHint: 'Tap asset cards to turn layers on or off and compare the fit live.',
          garmentSet: 'On mannequin',
          library: 'Wardrobe assets',
          libraryHint: 'Use the asset rail on the left to select garments and stack them directly onto the stage.',
          measurements: 'Measurement override',
          fitProfile: 'Fit profile',
          summaries: 'Fit summaries',
          save: 'Save fitting metadata',
          saving: 'Saving...',
          search: 'Search assets',
          allCategories: 'All categories',
          empty: 'No assets match the current filter.',
          emptyCloset: 'No wardrobe assets yet. Import links or uploads from the canvas and they will appear here for mannequin fitting.',
          emptySelection: 'Select an asset from the left rail to adjust measurements and fit profile.',
          noFitAsset: 'Add at least one asset to the mannequin to start saving fit overrides.',
          body: 'Body measurements',
          resetBody: 'Default body',
          selectedGarment: 'Selected garment',
          live: 'Live response',
          missingMeasurements: 'Missing measurements are inferred from image proportions and category defaults until you override them.',
          layerCount: (count: number) => `${count} ${count === 1 ? 'layer' : 'layers'}`,
        };

  const loadLab = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (focusAssetId) {
        const [{ response: currentResponse, data: currentData }, { response: listResponse, data: listData }] =
          await Promise.all([
            apiFetchJson<unknown>(`/v1/assets/${focusAssetId}`),
            apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>('/v1/assets?page=1&page_size=200'),
          ]);

        if (!currentResponse.ok) {
          throw new Error(getApiErrorMessage(currentData, copy.loadError));
        }

        const currentAsset = toAsset(currentData);
        if (!currentAsset) {
          throw new Error(copy.loadError);
        }

        const rawAssets = Array.isArray(listData?.items)
          ? listData.items
          : Array.isArray(listData?.assets)
            ? listData.assets
            : [];
        const parsedAssets = listResponse.ok
          ? rawAssets.map((entry) => toAsset(entry)).filter((entry): entry is Asset => Boolean(entry))
          : [];
        const nextAssets = ensureUniqueAssets([currentAsset, ...parsedAssets]);

        setAssets(nextAssets);
        setSelectedAssetId((prev) => (nextAssets.some((asset) => asset.id === prev) ? prev : currentAsset.id));
        setActiveAssetIds((prev) => {
          const preserved = prev.filter((id) => id !== currentAsset.id && nextAssets.some((asset) => asset.id === id));
          return uniqueIds([currentAsset.id, ...preserved]);
        });
        return;
      }

      const { response, data } = await apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>('/v1/assets?page=1&page_size=200');
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, copy.loadError));
      }

      const rawAssets = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.assets)
          ? data.assets
          : [];
      const nextAssets = ensureUniqueAssets(
        rawAssets.map((entry) => toAsset(entry)).filter((entry): entry is Asset => Boolean(entry))
      );
      const fallbackAsset = nextAssets[0] ?? null;

      setAssets(nextAssets);
      setSelectedAssetId((prev) => (nextAssets.some((asset) => asset.id === prev) ? prev : fallbackAsset?.id ?? ''));
      setActiveAssetIds((prev) => {
        const preserved = prev.filter((id) => nextAssets.some((asset) => asset.id === id));
        if (preserved.length > 0) return preserved;
        return fallbackAsset ? [fallbackAsset.id] : [];
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, focusAssetId]);

  useEffect(() => {
    void loadLab();
  }, [loadLab]);

  useEffect(() => {
    setBodyProfile(readSavedBodyProfile());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(bodyStorageKey, JSON.stringify(bodyProfile));
    } catch {
      // Ignore local persistence failures.
    }
  }, [bodyProfile]);

  const focusAsset = useMemo(
    () => (focusAssetId ? assets.find((asset) => asset.id === focusAssetId) ?? null : null),
    [assets, focusAssetId]
  );

  const activeAssets = useMemo(() => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return activeAssetIds.map((id) => byId.get(id)).filter((asset): asset is Asset => Boolean(asset));
  }, [activeAssetIds, assets]);

  const selectedAsset = useMemo(
    () => activeAssets.find((asset) => asset.id === selectedAssetId) ?? focusAsset ?? activeAssets[0] ?? assets[0] ?? null,
    [activeAssets, assets, focusAsset, selectedAssetId]
  );

  useEffect(() => {
    if (!selectedAsset) return;
    setDraftMeasurements(selectedAsset.metadata?.measurements ?? {});
    setDraftFitProfile({
      ...fitProfileDefaults,
      ...(selectedAsset.metadata?.fitProfile ?? {}),
    });
  }, [selectedAsset]);

  const categories = useMemo(
    () => ['all', ...new Set(assets.map((asset) => asset.category))],
    [assets]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false;
      if (!normalizedQuery) return true;
      return (
        asset.name.toLowerCase().includes(normalizedQuery) ||
        asset.brand?.toLowerCase().includes(normalizedQuery) ||
        asset.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [assets, category, deferredQuery]);

  const layers = useMemo(
    () => buildFittingLayers(activeAssets, deferredBodyProfile),
    [activeAssets, deferredBodyProfile]
  );

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.assetId === selectedAsset?.id) ?? null,
    [layers, selectedAsset?.id]
  );

  const selectedMeasurementSummary = useMemo(() => {
    if (!selectedAsset) return [];
    return [
      formatMeasurementLine('Chest', selectedAsset.metadata?.measurements?.chestCm),
      formatMeasurementLine('Waist', selectedAsset.metadata?.measurements?.waistCm),
      formatMeasurementLine('Hip', selectedAsset.metadata?.measurements?.hipCm),
      formatMeasurementLine('Length', selectedAsset.metadata?.measurements?.lengthCm),
      formatMeasurementLine('Inseam', selectedAsset.metadata?.measurements?.inseamCm),
    ].filter((entry): entry is string => Boolean(entry));
  }, [selectedAsset]);

  const handleToggleAsset = (nextAsset: Asset) => {
    setSelectedAssetId(nextAsset.id);
    if (focusAssetId && nextAsset.id === focusAssetId) return;

    setActiveAssetIds((prev) =>
      prev.includes(nextAsset.id) ? prev.filter((id) => id !== nextAsset.id) : [...prev, nextAsset.id]
    );
  };

  const handleSaveAssetMetadata = () => {
    if (!selectedAsset) return;
    setSaveError(null);

    startSaving(async () => {
      const { response, data } = await apiFetchJson<unknown>(`/v1/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            measurements: draftMeasurements,
            fitProfile: draftFitProfile,
          },
        }),
      });

      if (!response.ok) {
        setSaveError(getApiErrorMessage(data, copy.saveError));
        return;
      }

      const updatedAsset = toAsset(data);
      if (!updatedAsset) {
        setSaveError(copy.saveError);
        return;
      }

      setAssets((prev) => prev.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)));
    });
  };

  const bodyPanel = (
    <section className="rounded-[28px] bg-white/82 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-black p-2 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">{copy.mannequin}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-black">{copy.body}</h3>
          <p className="mt-2 text-sm leading-6 text-black/56">{copy.mannequinHint}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {bodyFields.map((field) => (
          <label key={field.key} className="block">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-black/56">
              <span>{field.label}</span>
              <span>{bodyProfile[field.key]} cm</span>
            </div>
            <input
              type="range"
              min={field.min}
              max={field.max}
              value={bodyProfile[field.key]}
              onChange={(event) =>
                setBodyProfile((prev) => ({
                  ...prev,
                  [field.key]: Number(event.target.value),
                }))
              }
              className="w-full accent-black"
            />
          </label>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-full"
        onClick={() => setBodyProfile(defaultBodyProfile)}
      >
        <RefreshCcw className="h-4 w-4" />
        {copy.resetBody}
      </Button>
    </section>
  );

  const selectedAssetPanel = selectedAsset ? (
    <>
      <section className="rounded-[28px] bg-white/82 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-[22px] bg-[#f7f1e8]">
            <img src={selectedAsset.imageSrc} alt={selectedAsset.name} className="h-full w-full object-contain p-2" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.selectedGarment}</p>
            <h3 className="mt-2 truncate text-xl font-semibold text-black">{selectedAsset.name}</h3>
            <p className="mt-1 text-sm text-black/54">
              {getClosetCategoryLabel(selectedAsset.category, language)}
              {selectedAsset.brand ? ` · ${selectedAsset.brand}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-black/44">
          <span className="rounded-full bg-black/[0.04] px-3 py-2">{copy.live}</span>
          <span className="rounded-full bg-black/[0.04] px-3 py-2">
            {selectedAsset.metadata?.cutout?.removedBackground ? copy.cutoutReady : copy.cutoutFallback}
          </span>
          <span className="rounded-full bg-black/[0.04] px-3 py-2">
            {getWardrobeSourceLabel(selectedAsset.source, language)}
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-black/58">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.source}</p>
            <p className="mt-1 break-all leading-6">
              {selectedAsset.sourceUrl ?? selectedAsset.metadata?.sourceTitle ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.cutout}</p>
            <p className="mt-1">
              {selectedAsset.metadata?.cutout?.removedBackground ? copy.cutoutReady : copy.cutoutFallback}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-black text-white hover:bg-black/90">
            <Link href="/studio">
              {copy.openStudio}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {selectedAsset.sourceUrl ? (
            <Button asChild variant="outline" className="rounded-full">
              <a href={selectedAsset.sourceUrl} target="_blank" rel="noreferrer">
                {copy.sourceLink}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] bg-white/82 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-black/48" />
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/42">{copy.summaries}</p>
        </div>
        <div className="grid gap-2">
          {selectedLayer?.fitSummary.length ? (
            selectedLayer.fitSummary.map((summary) => (
              <div key={summary.label} className="rounded-[18px] bg-[#f7f1e8] px-3 py-2">
                <p className="text-sm font-semibold text-black">{summary.label}</p>
                <p className="text-[11px] text-black/48">{summary.easeCm} cm ease</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-black/56">{copy.noFitAsset}</p>
          )}
        </div>
        {selectedMeasurementSummary.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedMeasurementSummary.map((line) => (
              <span key={line} className="rounded-full bg-black/[0.04] px-3 py-2 text-[11px] font-semibold text-black/60">
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] bg-white/82 p-4 shadow-sm">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-black/42">{copy.measurements}</p>
        <p className="mb-4 text-sm leading-6 text-black/56">{copy.missingMeasurements}</p>
        <div className="grid grid-cols-2 gap-3">
          {measurementFields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-[11px] font-semibold text-black/56">{field.label}</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draftMeasurements[field.key] ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  setDraftMeasurements((prev) => ({
                    ...prev,
                    [field.key]: nextValue.length === 0 ? undefined : Number(nextValue),
                  }));
                }}
                className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
                placeholder="cm"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-white/82 p-4 shadow-sm">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-black/42">{copy.fitProfile}</p>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-black/56">Silhouette</span>
            <select
              value={draftFitProfile.silhouette ?? 'regular'}
              onChange={(event) =>
                setDraftFitProfile((prev) => ({
                  ...prev,
                  silhouette: event.target.value as NonNullable<GarmentFitProfile['silhouette']>,
                }))
              }
              className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
            >
              <option value="tailored">Tailored</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-black/56">Layer</span>
            <select
              value={draftFitProfile.layer ?? 'mid'}
              onChange={(event) =>
                setDraftFitProfile((prev) => ({
                  ...prev,
                  layer: event.target.value as NonNullable<GarmentFitProfile['layer']>,
                }))
              }
              className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
            >
              <option value="base">Base</option>
              <option value="mid">Mid</option>
              <option value="outer">Outer</option>
            </select>
          </label>
        </div>
      </section>

      <Button
        type="button"
        className="h-12 w-full rounded-2xl bg-black text-white hover:bg-black/90"
        disabled={isSaving}
        onClick={handleSaveAssetMetadata}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.saving}
          </>
        ) : (
          copy.save
        )}
      </Button>
      {saveError ? <p className="text-sm text-[#8b2f2f]">{saveError}</p> : null}
    </>
  ) : (
    <div className="rounded-[28px] border border-dashed border-black/15 px-5 py-10 text-sm leading-7 text-black/56">
      {assets.length === 0 ? copy.emptyCloset : copy.emptySelection}
    </div>
  );

  const workspace = (
    <div className="space-y-4">
      {compact ? (
        <section className="grid gap-3 border-b border-black/8 pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/36">{copy.workspaceEyebrow}</p>
            <h1 className="font-serif text-3xl tracking-[-0.05em] text-black sm:text-4xl">{copy.workspaceTitle}</h1>
            <p className="max-w-3xl text-sm leading-7 text-black/58">{copy.workspaceDescription}</p>
          </div>
          <Button asChild variant="outline" className="rounded-full border-black/12 bg-white/80">
            <Link href="/studio">
              {copy.openStudio}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-4 border border-black/8 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.library}</p>
              <p className="mt-2 text-sm leading-6 text-black/56">{copy.libraryHint}</p>
            </div>
            {!compact ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/studio">
                  {copy.openStudio}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/25"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-3 w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/25"
            >
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry === 'all' ? copy.allCategories : getClosetCategoryLabel(entry, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.garmentSet}</p>
            {activeAssets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      selectedAssetId === asset.id ? 'bg-black text-white' : 'bg-black/[0.05] text-black/64 hover:text-black'
                    }`}
                  >
                    {asset.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-black/50">{copy.noFitAsset}</p>
            )}
          </div>

          <div className="space-y-2">
            {assets.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-black/15 px-4 py-6 text-sm leading-7 text-black/50">
                {copy.emptyCloset}
              </div>
            ) : filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const active = activeAssetIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleToggleAsset(asset)}
                    className={`flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition ${
                      selectedAssetId === asset.id
                        ? 'border-black bg-[#f3ece3] text-black'
                        : active
                          ? 'border-black/15 bg-black/[0.03] text-black'
                          : 'border-black/8 bg-white text-black/60'
                    }`}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-[18px] bg-[#f3ece3]">
                      <img src={asset.imageSrc} alt={asset.name} className="h-full w-full object-contain p-1.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{asset.name}</p>
                      <p className="truncate text-[11px] uppercase tracking-[0.18em] text-black/40">
                        {getClosetCategoryLabel(asset.category, language)}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-black/15 px-4 py-6 text-sm text-black/50">
                {copy.empty}
              </div>
            )}
          </div>
        </aside>

        <section className="relative min-h-[620px] overflow-hidden border border-black/8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(244,235,223,0.72)_45%,_rgba(239,228,214,0.92))]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <div className="rounded-full bg-white/75 px-3 py-2 text-[11px] font-semibold text-black/60 shadow-sm backdrop-blur-sm">
              {copy.stageHint}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedAsset ? (
                <div className="rounded-full bg-white/78 px-3 py-2 text-[11px] font-semibold text-black/66 shadow-sm backdrop-blur-sm">
                  {selectedAsset.name}
                </div>
              ) : null}
              <div className="rounded-full bg-black px-3 py-2 text-[11px] font-semibold text-white shadow-sm">
                {copy.layerCount(layers.length)}
              </div>
            </div>
          </div>
          <div className="h-[660px] sm:h-[720px]">
            <MannequinScene3D body={deferredBodyProfile} layers={layers} selectedAssetId={selectedAssetId} />
          </div>
        </section>

        <aside className="space-y-4 border border-black/8 bg-[#f4ede3] p-5">
          {bodyPanel}
          {selectedAssetPanel}
        </aside>
      </section>
    </div>
  );

  const renderFrame = (content: ReactNode) => {
    if (compact) return <div className="space-y-4">{content}</div>;

    const title = focusAsset ? (language === 'ko' ? `${focusAsset.name} 피팅 랩` : `${focusAsset.name} Fitting Lab`) : copy.title;
    return (
      <AppPageFrame eyebrow={copy.eyebrow} title={title} description={copy.description}>
        {content}
      </AppPageFrame>
    );
  };

  if (loading) {
    return renderFrame(
      <section className="flex min-h-[320px] items-center justify-center border border-black/8 bg-white text-sm text-black/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {copy.loading}
      </section>
    );
  }

  if (error || (focusAssetId && !focusAsset)) {
    return renderFrame(
      <section className="space-y-4 border border-red-500/20 bg-red-50 px-5 py-6">
        <p className="text-sm text-red-700">{error ?? copy.loadError}</p>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadLab()}>
          <RefreshCcw className="h-4 w-4" />
          {copy.retry}
        </Button>
      </section>
    );
  }

  return renderFrame(workspace);
}

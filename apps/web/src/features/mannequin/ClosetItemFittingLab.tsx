/* eslint-disable @next/next/no-img-element */
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Layers3,
  Loader2,
  RefreshCcw,
  Ruler,
  Search,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import {
  avatarPresetMap,
  avatarPresets,
  avatarStorageKey,
  parseAvatarPresetId,
  type AvatarPresetId,
} from '@/features/shared-3d/avatarPresets';
import { getClosetCategoryLabel, getWardrobeSourceLabel } from '@/features/renewal-app/data';
import type { Asset, GarmentFitProfile, GarmentMeasurements } from '@/features/studio/types';
import { toAsset } from '@/features/studio/utils';
import { apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { defaultDemoClosetAssetId, demoClosetActiveAssetIds, demoClosetAssets } from './demoClosetAssets';
import { buildFittingLayers, defaultBodyProfile, type BodyProfile } from './fitting';

const FittingCanvas3D = dynamic(
  () => import('./FittingCanvas3D').then((module) => module.FittingCanvas3D),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-black/5" /> }
);

const bodyStorageKey = 'freestyle:mannequin-body-profile';
const categoryRailOrder: Array<Asset['category'] | 'all'> = ['all', 'outerwear', 'tops', 'bottoms', 'shoes', 'accessories', 'custom'];

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
  if (typeof window === 'undefined') return defaultBodyProfile;
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

const readSavedAvatarPreset = () => {
  if (typeof window === 'undefined') return parseAvatarPresetId(undefined);
  try {
    return parseAvatarPresetId(window.localStorage.getItem(avatarStorageKey));
  } catch {
    return parseAvatarPresetId(undefined);
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

type WorkbenchMode = 'profile' | 'traits' | 'fit';

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
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(readSavedAvatarPreset);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(readSavedBodyProfile);
  const [draftMeasurements, setDraftMeasurements] = useState<GarmentMeasurements>({});
  const [draftFitProfile, setDraftFitProfile] = useState<GarmentFitProfile>(fitProfileDefaults);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [usingDemoRack, setUsingDemoRack] = useState(false);
  const [mode, setMode] = useState<WorkbenchMode>('profile');
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
          avatars: 'Avatar',
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
          equipped: '장착 중',
          categories: '카테고리',
          body: '바디 치수',
          resetBody: '기본 체형',
          selectedGarment: '선택한 의류',
          live: '실시간 반영',
          missingMeasurements: '실측값이 비어 있으면 이미지 비율과 카테고리 기본값으로 먼저 추정합니다.',
          layerCount: (count: number) => `${count}개 레이어`,
          avatarSource: '공개 avatar asset',
          demoRack: '데모 랙',
          demoRackHint: '옷장이 비어 있거나 API에 연결되지 않아 기본 dress-up 샘플을 보여주고 있습니다.',
          creatorTitle: '캐릭터 생성',
          creatorHint: '좌우 패널에서 에셋과 캐릭터 프리셋을 바꾸고, 중앙 무대에서 바로 피팅을 확인하세요.',
          detailFitting: '상세 피팅',
          stageAction: '캔버스 열기',
          quickMenu: '퀵 메뉴',
          quickLooks: '현재 입힌 룩',
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
          avatars: 'Avatar',
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
          equipped: 'Equipped',
          categories: 'Categories',
          body: 'Body measurements',
          resetBody: 'Default body',
          selectedGarment: 'Selected garment',
          live: 'Live response',
          missingMeasurements: 'Missing measurements are inferred from image proportions and category defaults until you override them.',
          layerCount: (count: number) => `${count} ${count === 1 ? 'layer' : 'layers'}`,
          avatarSource: 'Public avatar asset',
          demoRack: 'Demo rack',
          demoRackHint: 'The closet is empty or the API is unavailable, so the built-in dress-up sample is loaded.',
          creatorTitle: 'Character creator',
          creatorHint: 'Swap assets and avatar presets from the side panels, then inspect the fitting live on the central stage.',
          detailFitting: 'Detailed fit',
          stageAction: 'Open canvas',
          quickMenu: 'Quick menu',
          quickLooks: 'Current look',
        };

  const uiCopy =
    language === 'ko'
      ? {
          utilityTitle: focusAssetId ? '선택 아이템 피팅 스테이지' : '마네킹 스타일 워크스테이션',
          utilityDescription: focusAssetId
            ? '선택한 의류를 중심으로 프리셋, 체형, 레이어를 한 화면에서 바로 조정합니다.'
            : '좌우 패널과 중앙 스테이지를 오가며 코디와 체형을 동시에 조율합니다.',
          selected: '선택 에셋',
          currentAvatar: '현재 아바타',
          lookLayers: '착장 레이어',
          browserTitle: '아웃핏 브라우저',
          browserHint: '검색과 카테고리 필터로 입힐 아이템을 고르고 바로 무대에 반영합니다.',
          activeLook: '현재 착장',
          noActiveLook: '아직 무대에 올린 아이템이 없습니다.',
          modeProfile: '프로필',
          modeTraits: '체형',
          modeFit: '피팅',
          inspectorTitle: '프로필 / 특성',
          inspectorHint: '아바타와 선택 의류 정보를 확인하고, 하단 탭으로 체형과 피팅 편집을 전환합니다.',
          browserEmpty: '필터에 맞는 아이템이 없습니다.',
          detailLink: '상세 피팅 열기',
        }
      : {
          utilityTitle: focusAssetId ? 'Selected Item Fitting Stage' : 'Mannequin Style Workstation',
          utilityDescription: focusAssetId
            ? 'Tune presets, body traits, and garment layers around the selected piece in one surface.'
            : 'Move between the side panels and central stage to refine outfit layers and body traits together.',
          selected: 'Selected asset',
          currentAvatar: 'Current avatar',
          lookLayers: 'Look layers',
          browserTitle: 'Outfit browser',
          browserHint: 'Search, filter by category, and send garments straight onto the stage.',
          activeLook: 'Current look',
          noActiveLook: 'No garments are on the stage yet.',
          modeProfile: 'Profile',
          modeTraits: 'Traits',
          modeFit: 'Fit lab',
          inspectorTitle: 'Profile / traits',
          inspectorHint: 'Review avatar and garment details here, then switch tabs to body traits or fit editing.',
          browserEmpty: 'No items match the current filter.',
          detailLink: 'Open detailed fit',
        };

  const activateDemoRack = useCallback(() => {
    setUsingDemoRack(true);
    setAssets(demoClosetAssets);
    setSelectedAssetId(defaultDemoClosetAssetId);
    setActiveAssetIds(demoClosetActiveAssetIds);
  }, []);

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

      if (nextAssets.length === 0) {
        activateDemoRack();
        return;
      }

      setUsingDemoRack(false);
      setAssets(nextAssets);
      setSelectedAssetId((prev) => (nextAssets.some((asset) => asset.id === prev) ? prev : fallbackAsset?.id ?? ''));
      setActiveAssetIds((prev) => {
        const preserved = prev.filter((id) => nextAssets.some((asset) => asset.id === id));
        if (preserved.length > 0) return preserved;
        return fallbackAsset ? [fallbackAsset.id] : [];
      });
    } catch (nextError) {
      if (!focusAssetId) {
        activateDemoRack();
        return;
      }
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [activateDemoRack, copy.loadError, focusAssetId]);

  useEffect(() => {
    void loadLab();
  }, [loadLab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(bodyStorageKey, JSON.stringify(bodyProfile));
    } catch {
      // Ignore local persistence failures.
    }
  }, [bodyProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(avatarStorageKey, avatarId);
    } catch {
      // Ignore local persistence failures.
    }
  }, [avatarId]);

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

  const visibleCategories = useMemo(() => {
    const available = new Set(assets.map((asset) => asset.category));
    return categoryRailOrder.filter((entry) => entry === 'all' || available.has(entry));
  }, [assets]);

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

  const equippedSlots = useMemo(() => {
    const map = new Map<string, Asset>();
    activeAssets.forEach((asset) => {
      if (!map.has(asset.category)) {
        map.set(asset.category, asset);
      }
    });
    return ['outerwear', 'tops', 'bottoms', 'shoes', 'accessories', 'custom']
      .map((entry) => map.get(entry))
      .filter((asset): asset is Asset => Boolean(asset));
  }, [activeAssets]);
  const selectedAvatarPreset = avatarPresetMap[avatarId];

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

  const profilePanel = (
    <>
      <section className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-[20px] bg-[#ede1cf]">
            {selectedAsset ? (
              <img src={selectedAsset.imageSrc} alt={selectedAsset.name} className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex h-full items-center justify-center text-[#7a6b57]">
                <Shirt className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.selectedGarment}</p>
            {selectedAsset ? (
              <>
                <h2 className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-white">{selectedAsset.name}</h2>
                <p className="mt-1 text-sm text-white/58">
                  {getClosetCategoryLabel(selectedAsset.category, language)}
                  {selectedAsset.brand ? ` · ${selectedAsset.brand}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-white/56">{copy.emptySelection}</p>
            )}
          </div>
        </div>

        {selectedAsset ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">
              <span className="rounded-full bg-white/8 px-3 py-2">{copy.live}</span>
              <span className="rounded-full bg-white/8 px-3 py-2">
                {selectedAsset.metadata?.cutout?.removedBackground ? copy.cutoutReady : copy.cutoutFallback}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-2">
                {getWardrobeSourceLabel(selectedAsset.source, language)}
              </span>
            </div>

            {selectedMeasurementSummary.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedMeasurementSummary.map((line) => (
                  <span key={line} className="rounded-full bg-black/20 px-3 py-2 text-[11px] font-semibold text-white/72">
                    {line}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {!focusAssetId ? (
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]">
                  <Link href={`/app/closet/item/${selectedAsset.id}`}>{uiCopy.detailLink}</Link>
                </Button>
              ) : null}
              {selectedAsset.sourceUrl ? (
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]">
                  <a href={selectedAsset.sourceUrl} target="_blank" rel="noreferrer">
                    {copy.sourceLink}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-[#d2a264] p-2 text-[#1a1511]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.avatars}</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{selectedAvatarPreset.label[language]}</h3>
            <p className="mt-2 text-sm leading-6 text-white/58">{selectedAvatarPreset.description[language]}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {avatarPresets.map((preset) => {
            const active = preset.id === avatarId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarId(preset.id)}
                className={cn(
                  'rounded-[18px] border px-4 py-3 text-left transition',
                  active
                    ? 'border-[#d2a264] bg-[#231d17] text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/66 hover:border-white/18 hover:text-white'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{preset.label[language]}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/42">{preset.license}</p>
                  </div>
                  <span className="rounded-full bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">
                    {preset.description[language]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-5 text-white/54">
          {copy.avatarSource}:{' '}
          <a href={selectedAvatarPreset.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {selectedAvatarPreset.author}
          </a>
        </p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#d2a264]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.summaries}</p>
        </div>
        {selectedLayer?.fitSummary.length ? (
          <div className="grid gap-2">
            {selectedLayer.fitSummary.map((summary) => (
              <div key={summary.label} className="rounded-[18px] border border-white/10 bg-black/18 px-3 py-2">
                <p className="text-sm font-semibold text-white">{summary.label}</p>
                <p className="text-[11px] text-white/44">{summary.easeCm} cm ease</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-white/56">{copy.noFitAsset}</p>
        )}
      </section>
    </>
  );

  const traitsPanel = (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white/10 p-2 text-white">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.mannequin}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{copy.body}</h3>
          <p className="mt-2 text-sm leading-6 text-white/58">{copy.mannequinHint}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {bodyFields.map((field) => (
          <label key={field.key} className="block">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-white/56">
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
              className="w-full accent-[#d2a264]"
            />
          </label>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]"
        onClick={() => setBodyProfile(defaultBodyProfile)}
      >
        <RefreshCcw className="h-4 w-4" />
        {copy.resetBody}
      </Button>
    </section>
  );

  const fitPanel = selectedAsset ? (
    <>
      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#d2a264]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.measurements}</p>
        </div>
        <p className="mb-4 text-sm leading-6 text-white/56">{copy.missingMeasurements}</p>
        <div className="grid grid-cols-2 gap-3">
          {measurementFields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-[11px] font-semibold text-white/56">{field.label}</span>
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
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d2a264]/55"
                placeholder="cm"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.fitProfile}</p>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-white/56">Silhouette</span>
            <select
              value={draftFitProfile.silhouette ?? 'regular'}
              onChange={(event) =>
                setDraftFitProfile((prev) => ({
                  ...prev,
                  silhouette: event.target.value as NonNullable<GarmentFitProfile['silhouette']>,
                }))
              }
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[#d2a264]/55"
            >
              <option value="tailored">Tailored</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-white/56">Layer</span>
            <select
              value={draftFitProfile.layer ?? 'mid'}
              onChange={(event) =>
                setDraftFitProfile((prev) => ({
                  ...prev,
                  layer: event.target.value as NonNullable<GarmentFitProfile['layer']>,
                }))
              }
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[#d2a264]/55"
            >
              <option value="base">Base</option>
              <option value="mid">Mid</option>
              <option value="outer">Outer</option>
            </select>
          </label>
        </div>
      </section>

      <div className="space-y-3">
        <Button
          type="button"
          className="h-12 w-full rounded-full bg-[#d2a264] text-[#1a1511] hover:bg-[#ddb17a]"
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
        {saveError ? <p className="text-sm text-[#f1b7b7]">{saveError}</p> : null}
      </div>
    </>
  ) : (
    <div className="rounded-[24px] border border-dashed border-white/15 px-5 py-10 text-sm leading-7 text-white/56">
      {assets.length === 0 ? copy.emptyCloset : copy.emptySelection}
    </div>
  );

  const categoryRailIcons: Record<string, typeof Shirt> = {
    all: Layers3,
    outerwear: Sparkles,
    tops: Shirt,
    bottoms: Ruler,
    shoes: UserRound,
    accessories: SlidersHorizontal,
    custom: Sparkles,
  };

  const stageTabs = [
    { id: 'presets', label: language === 'ko' ? 'Zoi 프리셋' : 'Zoi Presets' },
    { id: 'face', label: language === 'ko' ? '얼굴' : 'Face' },
    { id: 'body', label: language === 'ko' ? '바디' : 'Body' },
    { id: 'outfit', label: language === 'ko' ? '아웃핏' : 'Outfit' },
    { id: 'accessories', label: language === 'ko' ? '액세서리' : 'Accessories' },
    { id: 'craft', label: language === 'ko' ? '제작' : 'Craft' },
  ] as const;
  type StageTabId = (typeof stageTabs)[number]['id'];
  const [stageTab, setStageTab] = useState<StageTabId>('outfit');

  const ageIcons = ['👶', '🧒', '🧑', '🧔', '👩', '🧓'];
  const genderOptions = ['♂', '♀', '⚧'];
  const traitKeywords = selectedAvatarPreset.description[language]
    .split(/[.,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 4);
  const outfitSubcategories =
    language === 'ko'
      ? ['Sneakers', 'Loafers', 'Boots', 'Slippers', 'Sandals']
      : ['Sneakers', 'Loafers', 'Boots', 'Slippers', 'Sandals'];
  const thumbnailPool = useMemo(() => {
    if (filteredAssets.length === 0) return [];
    const targetCount = 30;
    return Array.from({ length: Math.max(targetCount, filteredAssets.length) }, (_, index) => filteredAssets[index % filteredAssets.length]);
  }, [filteredAssets]);

  const workspace = (
    <div
      className={cn(
        'relative mx-auto min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#8f949e_0%,#a8aeb9_35%,#c2c8d2_100%)] text-[#11141a]',
        !compact && 'rounded-[24px]'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_16%,rgba(255,255,255,0.34),rgba(255,255,255,0.08)_42%,transparent_76%)]" />
      <header className="absolute inset-x-0 top-0 z-20 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-white/95">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-white/26 bg-white/14 px-3 backdrop-blur-sm"
            >
              <span className="text-base leading-none">‹</span>
              <span>{language === 'ko' ? 'Go Back' : 'Go Back'}</span>
            </button>
            <span className="text-white/42">|</span>
            <span>{language === 'ko' ? 'Create a Zoi' : 'Create a Zoi'}</span>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-8 rounded-full border-white/26 bg-white/88 px-3 text-xs text-[#3a414f] hover:bg-white"
          >
            <Link href="/studio">
              {language === 'ko' ? 'Upload to Canvas' : 'Upload to Canvas'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative z-10 grid min-h-screen grid-rows-[auto_minmax(0,1fr)_auto] px-4 pb-4 pt-16 sm:px-6 sm:pb-5 sm:pt-20">
        <section className="grid min-h-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)_350px]">
          <aside className="min-h-0 rounded-[24px] border border-white/24 bg-white/17 p-3 shadow-[0_18px_42px_rgba(39,45,56,0.18)] backdrop-blur-md">
            <div className="space-y-4">
              <section className="border-b border-white/28 pb-3">
                <p className="text-sm font-semibold text-white/95">Profile ⚠</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input className="h-8 rounded-lg border border-white/28 bg-white/54 px-2 text-xs text-[#2e3440]" placeholder="First Name" />
                  <input className="h-8 rounded-lg border border-white/28 bg-white/54 px-2 text-xs text-[#2e3440]" placeholder="Last Name" />
                </div>
              </section>

              <section className="border-b border-white/28 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72">Age Group</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ageIcons.map((icon) => (
                    <button key={icon} type="button" className="h-8 w-8 rounded-full border border-white/34 bg-white/54 text-sm shadow-sm">
                      {icon}
                    </button>
                  ))}
                </div>
              </section>

              <section className="border-b border-white/28 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72">Gender</p>
                <div className="mt-2 flex gap-2">
                  {genderOptions.map((entry) => (
                    <button key={entry} type="button" className="h-8 w-8 rounded-full border border-white/34 bg-white/54 text-sm text-[#38404f] shadow-sm">
                      {entry}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[16px] border border-white/28 bg-white/22 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72">Trait ⚠</p>
                <div className="mt-2 flex gap-2">
                  <div className="h-20 w-16 overflow-hidden rounded-lg bg-white/64">
                    {selectedAsset ? (
                      <img src={selectedAsset.imageSrc} alt={selectedAsset.name} className="h-full w-full object-contain p-1" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold leading-tight text-white">Adventurer</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/75">
                      {traitKeywords.map((entry) => (
                        <span key={entry}>{entry}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72">Desired Life (Optional)</p>
                <input
                  className="mt-2 h-8 w-full rounded-lg border border-white/28 bg-white/54 px-2 text-xs text-[#2e3440]"
                  defaultValue={language === 'ko' ? 'Excitement' : 'Life of Excitement'}
                />
              </section>

              <section className="pt-2">
                <Button asChild variant="outline" className="h-8 rounded-full border-white/26 bg-white/24 px-3 text-xs text-white/90 hover:bg-white/32">
                  <Link href="/studio">Studio</Link>
                </Button>
              </section>
            </div>
          </aside>

          <section className="relative min-h-0 rounded-[24px] border border-white/24 bg-[radial-gradient(circle_at_50%_14%,rgba(240,244,250,0.95),rgba(214,221,232,0.48)_52%,rgba(192,199,210,0.2)_100%)] shadow-[0_22px_52px_rgba(40,46,57,0.22)]">
            <div className="h-full min-h-[560px]">
              <FittingCanvas3D body={deferredBodyProfile} layers={layers} selectedAssetId={selectedAssetId} avatarId={avatarId} />
            </div>
          </section>

          <aside className="min-h-0 rounded-[24px] border border-white/24 bg-white/18 p-2.5 shadow-[0_18px_42px_rgba(39,45,56,0.18)] backdrop-blur-md">
            <div className="mb-2 px-1">
              <p className="text-sm font-semibold text-white/95">Outfit</p>
            </div>
            <div className="grid h-[calc(100%-28px)] min-h-[520px] grid-cols-[110px_minmax(0,1fr)] gap-2">
              <div className="overflow-y-auto border-r border-white/28 pr-2">
                {visibleCategories.map((entry) => {
                  const Icon = categoryRailIcons[entry] ?? Layers3;
                  const label = entry === 'all' ? copy.allCategories : getClosetCategoryLabel(entry, language);
                  return (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setCategory(entry)}
                      className={cn(
                        'mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs',
                        category === entry ? 'bg-white/26 font-semibold text-white' : 'text-white/74 hover:bg-white/14'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="overflow-y-auto">
                {thumbnailPool.length > 0 ? (
                  <>
                    <div className="mb-2 space-y-1 px-1 text-[11px] text-white/68">
                      {outfitSubcategories.map((entry) => (
                        <p key={entry}>{entry}</p>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {thumbnailPool.map((asset, index) => (
                      <button
                        key={`${asset.id}-${index}`}
                        type="button"
                        onClick={() => handleToggleAsset(asset)}
                        className={cn(
                          'rounded-full border p-1 shadow-sm',
                          activeAssetIds.includes(asset.id)
                            ? 'border-[#89a7cb] bg-white/44'
                            : 'border-white/28 bg-white/28 hover:bg-white/36'
                        )}
                      >
                        <div className="aspect-square overflow-hidden rounded-full bg-white/72">
                          <img src={asset.imageSrc} alt={asset.name} className="h-full w-full object-contain p-1.5" />
                        </div>
                      </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded border border-dashed border-white/28 px-3 py-5 text-xs text-white/72">{uiCopy.browserEmpty}</div>
                )}
              </div>
            </div>
          </aside>
        </section>

        <footer className="flex items-end justify-center pb-1 pt-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/28 bg-white/24 px-3 py-2 backdrop-blur-md">
            {stageTabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setStageTab(entry.id);
                  if (entry.id === 'body') setMode('traits');
                  if (entry.id === 'outfit') setMode('fit');
                  if (entry.id === 'face' || entry.id === 'presets' || entry.id === 'craft') setMode('profile');
                }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium',
                  stageTab === entry.id ? 'bg-white text-[#2b3240]' : 'text-white/78 hover:bg-white/16'
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );

  const renderFrame = (content: ReactNode) => {
    if (compact) return content;

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

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
import type { RenewalLanguage } from '@/features/renewal-app/content';
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
import { buildFittingLayers, defaultBodyProfile, type BodyProfile, type GarmentLayerConfig } from './fitting';

const FittingCanvas3D = dynamic(
  () => import('./FittingCanvas3D').then((module) => module.FittingCanvas3D),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-black/5" /> }
);

const bodyStorageKey = 'freestyle:mannequin-body-profile';
const categoryRailOrder: Array<Asset['category'] | 'all'> = ['all', 'outerwear', 'tops', 'bottoms', 'shoes', 'accessories', 'custom'];

type BodyFieldKey = 'heightCm' | 'shoulderCm' | 'chestCm' | 'waistCm' | 'hipCm' | 'inseamCm';
type MeasurementFieldKey = 'shoulderCm' | 'chestCm' | 'waistCm' | 'hipCm' | 'sleeveLengthCm' | 'lengthCm' | 'inseamCm' | 'hemCm';

const bodyFields = [
  { key: 'heightCm', label: 'Height', min: 145, max: 205 },
  { key: 'shoulderCm', label: 'Shoulder', min: 34, max: 60 },
  { key: 'chestCm', label: 'Chest', min: 72, max: 140 },
  { key: 'waistCm', label: 'Waist', min: 54, max: 132 },
  { key: 'hipCm', label: 'Hip', min: 74, max: 150 },
  { key: 'inseamCm', label: 'Inseam', min: 62, max: 98 },
] as const satisfies ReadonlyArray<{ key: BodyFieldKey; label: string; min: number; max: number }>;

const measurementFields = [
  { key: 'shoulderCm', label: 'Shoulder' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'waistCm', label: 'Waist' },
  { key: 'hipCm', label: 'Hip' },
  { key: 'sleeveLengthCm', label: 'Sleeve' },
  { key: 'lengthCm', label: 'Length' },
  { key: 'inseamCm', label: 'Inseam' },
  { key: 'hemCm', label: 'Hem' },
] as const satisfies ReadonlyArray<{ key: MeasurementFieldKey; label: string }>;

const fitProfileDefaults: GarmentFitProfile = {
  silhouette: 'regular',
  layer: 'mid',
  structure: 'balanced',
  stretch: 0.2,
  drape: 0.5,
};

const categoryRailIcons: Record<string, typeof Shirt> = {
  all: Layers3,
  outerwear: Sparkles,
  tops: Shirt,
  bottoms: Ruler,
  shoes: UserRound,
  accessories: SlidersHorizontal,
  custom: Sparkles,
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

const buildLabCopy = (language: RenewalLanguage) =>
  language === 'ko'
    ? {
        eyebrow: '옷장 / 피팅 랩',
        title: '3D 마네킹 피팅 랩',
        description:
          '선택한 옷장 아이템을 중심으로 다른 에셋을 겹쳐 입히고, 마네킹 치수를 조정하고, 부족한 실측값을 바로 보정할 수 있습니다.',
        loading: '피팅 랩을 준비하는 중...',
        loadError: '피팅 랩을 불러오지 못했습니다.',
        saveError: '피팅 메타데이터를 저장하지 못했습니다.',
        retry: '다시 시도',
        openStudio: '캔버스 열기',
        sourceLink: '원본 링크 열기',
        cutoutReady: '배경 제거 완료',
        cutoutFallback: '원본 이미지를 사용 중',
        avatars: 'Avatar',
        avatarSource: '공개 avatar asset',
        mannequin: '마네킹',
        mannequinHint: '체형 슬라이더를 조절하면 중앙 스테이지가 즉시 업데이트됩니다.',
        stageTitle: '3D 스테이지',
        stageHint: '드래그로 회전하고 확대해 실루엣과 레이어 균형을 확인하세요.',
        stageEmpty: '오른쪽 라이브러리에서 에셋을 장착하면 레이어가 여기에 쌓입니다.',
        measurements: '치수 보정',
        fitProfile: '핏 프로필',
        summaries: '핏 요약',
        save: '피팅 메타데이터 저장',
        saving: '저장 중...',
        search: '에셋 검색',
        allCategories: '전체 카테고리',
        empty: '현재 필터에 맞는 에셋이 없습니다.',
        emptyCloset: '아직 옷장 에셋이 없습니다. 캔버스에서 링크나 업로드를 가져오면 여기서 바로 마네킹에 입혀볼 수 있습니다.',
        emptySelection: '의류를 선택하면 측정치와 핏 프로필을 편집할 수 있습니다.',
        noFitAsset: '마네킹에 에셋을 하나 이상 추가하면 여기서 핏 요약을 확인할 수 있습니다.',
        equipped: '장착 중',
        select: '선택',
        equip: '장착',
        remove: '해제',
        body: '바디 치수',
        resetBody: '기본 체형',
        selectedGarment: '선택한 의류',
        live: '실시간 반영',
        missingMeasurements: '실측값이 비어 있으면 이미지 비율과 카테고리 기본값으로 먼저 추정합니다.',
        layerCount: (count: number) => `${count}개 레이어`,
        demoRack: '데모 랙',
        demoRackHint: '옷장이 비어 있거나 API에 연결되지 않아 기본 dress-up 샘플을 보여주고 있습니다.',
        assetLibrary: '옷장 에셋',
        assetLibraryHint: '검색과 카테고리 필터로 에셋을 찾고, 선택과 장착을 분리해서 관리합니다.',
        detailLink: '상세 피팅 열기',
        currentLook: '현재 착장',
        currentLookHint: '아래 레이어 칩으로 현재 스테이지 구성과 선택 상태를 빠르게 전환합니다.',
        noActiveLook: '아직 스테이지에 올라간 아이템이 없습니다.',
        fitEditor: '핏 편집',
        fitEditorHint: '선택한 의류의 measurement override와 fit profile을 저장합니다.',
        bodyPanelTitle: '바디 / 아바타',
        bodyPanelHint: '왼쪽에서 아바타 프리셋과 체형을 조절하고, 중앙에서 결과를 바로 확인합니다.',
        librarySelected: '선택됨',
        primaryPiece: '기준 아이템',
      }
    : {
        eyebrow: 'Closet / Fitting Lab',
        title: 'Real-time 3D Mannequin Lab',
        description:
          'Dress the selected closet item with other wardrobe assets, adjust the mannequin measurements, and correct missing garment data live.',
        loading: 'Preparing the fitting lab...',
        loadError: 'Failed to load the fitting lab.',
        saveError: 'Failed to save fitting metadata.',
        retry: 'Retry',
        openStudio: 'Open canvas',
        sourceLink: 'Open source link',
        cutoutReady: 'Background removed',
        cutoutFallback: 'Using original image',
        avatars: 'Avatar',
        avatarSource: 'Public avatar asset',
        mannequin: 'Mannequin',
        mannequinHint: 'Body sliders update the central stage immediately so you can read silhouette and drape live.',
        stageTitle: '3D stage',
        stageHint: 'Drag to rotate and zoom so you can inspect silhouette, drape, and layer balance.',
        stageEmpty: 'Equip garments from the library to start layering them on the stage.',
        measurements: 'Measurement override',
        fitProfile: 'Fit profile',
        summaries: 'Fit summaries',
        save: 'Save fitting metadata',
        saving: 'Saving...',
        search: 'Search assets',
        allCategories: 'All categories',
        empty: 'No assets match the current filter.',
        emptyCloset: 'No wardrobe assets yet. Import links or uploads from the canvas and they will appear here for mannequin fitting.',
        emptySelection: 'Select a garment to edit its measurements and fit profile.',
        noFitAsset: 'Add at least one asset to the mannequin to review the fit summary here.',
        equipped: 'Equipped',
        select: 'Select',
        equip: 'Equip',
        remove: 'Remove',
        body: 'Body measurements',
        resetBody: 'Default body',
        selectedGarment: 'Selected garment',
        live: 'Live response',
        missingMeasurements: 'Missing measurements are inferred from image proportions and category defaults until you override them.',
        layerCount: (count: number) => `${count} ${count === 1 ? 'layer' : 'layers'}`,
        demoRack: 'Demo rack',
        demoRackHint: 'The closet is empty or the API is unavailable, so the built-in dress-up sample is loaded.',
        assetLibrary: 'Wardrobe assets',
        assetLibraryHint: 'Search and filter the library, then manage selection and stage toggles separately.',
        detailLink: 'Open detailed fit',
        currentLook: 'Current look',
        currentLookHint: 'Use the layer chips below to switch the active stage selection without leaving the viewport.',
        noActiveLook: 'No garments are on the stage yet.',
        fitEditor: 'Fit editor',
        fitEditorHint: 'Save measurement overrides and fit profile data for the selected garment.',
        bodyPanelTitle: 'Body / avatar',
        bodyPanelHint: 'Adjust avatar presets and body traits on the left, then inspect the result on the central stage.',
        librarySelected: 'Selected',
        primaryPiece: 'Primary piece',
      };

type LabCopy = ReturnType<typeof buildLabCopy>;
type LibraryCategory = Asset['category'] | 'all';

type ClosetItemFittingLabProps = {
  assetId?: string;
  compact?: boolean;
};

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

function SectionCard({ children, className }: SectionCardProps) {
  return <section className={cn('rounded-[24px] border border-white/10 bg-white/[0.05] p-4', className)}>{children}</section>;
}

type FitEditPanelProps = {
  assets: Asset[];
  copy: LabCopy;
  draftFitProfile: GarmentFitProfile;
  draftMeasurements: GarmentMeasurements;
  isSaving: boolean;
  onFitProfileChange: (updates: Partial<GarmentFitProfile>) => void;
  onMeasurementChange: (key: MeasurementFieldKey, value: string) => void;
  onSave: () => void;
  saveError: string | null;
  selectedAsset: Asset | null;
};

function FitEditPanel({
  assets,
  copy,
  draftFitProfile,
  draftMeasurements,
  isSaving,
  onFitProfileChange,
  onMeasurementChange,
  onSave,
  saveError,
  selectedAsset,
}: FitEditPanelProps) {
  if (!selectedAsset) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/15 px-5 py-10 text-sm leading-7 text-white/56">
        {assets.length === 0 ? copy.emptyCloset : copy.emptySelection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/10 p-2 text-white">
            <Ruler className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.fitEditor}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{selectedAsset.name}</h3>
            <p className="mt-2 text-sm leading-6 text-white/58">{copy.fitEditorHint}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#d2a264]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.measurements}</p>
        </div>
        <p className="mb-4 text-sm leading-6 text-white/56">{copy.missingMeasurements}</p>
        <div className="grid grid-cols-2 gap-3">
          {measurementFields.map((field) => (
            <label key={String(field.key)} className="block">
              <span className="mb-1 block text-[11px] font-semibold text-white/56">{field.label}</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draftMeasurements[field.key] ?? ''}
                onChange={(event) => onMeasurementChange(field.key, event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d2a264]/55"
                placeholder="cm"
              />
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.fitProfile}</p>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-white/56">Silhouette</span>
            <select
              value={draftFitProfile.silhouette ?? 'regular'}
              onChange={(event) =>
                onFitProfileChange({
                  silhouette: event.target.value as NonNullable<GarmentFitProfile['silhouette']>,
                })
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
                onFitProfileChange({
                  layer: event.target.value as NonNullable<GarmentFitProfile['layer']>,
                })
              }
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[#d2a264]/55"
            >
              <option value="base">Base</option>
              <option value="mid">Mid</option>
              <option value="outer">Outer</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-white/56">Structure</span>
            <select
              value={draftFitProfile.structure ?? 'balanced'}
              onChange={(event) =>
                onFitProfileChange({
                  structure: event.target.value as NonNullable<GarmentFitProfile['structure']>,
                })
              }
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-[#d2a264]/55"
            >
              <option value="soft">Soft</option>
              <option value="balanced">Balanced</option>
              <option value="structured">Structured</option>
            </select>
          </label>
        </div>
      </SectionCard>

      <div className="space-y-3">
        <Button
          type="button"
          className="h-12 w-full rounded-full bg-[#d2a264] text-[#1a1511] hover:bg-[#ddb17a]"
          disabled={isSaving}
          onClick={onSave}
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
    </div>
  );
}

type LeftPanelProps = {
  avatarId: AvatarPresetId;
  bodyProfile: BodyProfile;
  copy: LabCopy;
  focusAssetId: string | null;
  language: RenewalLanguage;
  onAvatarChange: (avatarId: AvatarPresetId) => void;
  onBodyFieldChange: (key: BodyFieldKey, value: number) => void;
  onBodyReset: () => void;
  selectedAsset: Asset | null;
  selectedAvatarPreset: (typeof avatarPresets)[number];
  selectedLayer: GarmentLayerConfig | null;
  selectedMeasurementSummary: string[];
  fitEditPanel: ReactNode;
};

function LeftPanel({
  avatarId,
  bodyProfile,
  copy,
  focusAssetId,
  language,
  onAvatarChange,
  onBodyFieldChange,
  onBodyReset,
  selectedAsset,
  selectedAvatarPreset,
  selectedLayer,
  selectedMeasurementSummary,
  fitEditPanel,
}: LeftPanelProps) {
  return (
    <aside className="order-2 min-h-0 overflow-hidden rounded-[28px] border border-white/12 bg-[#11161d]/78 shadow-[0_20px_60px_rgba(8,12,18,0.28)] backdrop-blur-xl lg:order-1">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.bodyPanelTitle}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{copy.selectedGarment}</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">{copy.bodyPanelHint}</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <SectionCard>
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
                    <h3 className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-white">{selectedAsset.name}</h3>
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
                  {focusAssetId && selectedAsset.id === focusAssetId ? (
                    <span className="rounded-full bg-[#d2a264]/16 px-3 py-2 text-[#f5d1a0]">{copy.primaryPiece}</span>
                  ) : null}
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
                      <Link href={`/app/closet/item/${selectedAsset.id}`}>{copy.detailLink}</Link>
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
          </SectionCard>

          <SectionCard>
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
                    onClick={() => onAvatarChange(preset.id)}
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
                        {active ? copy.librarySelected : preset.author}
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
          </SectionCard>

          <SectionCard>
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
                <label key={String(field.key)} className="block">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-white/56">
                    <span>{field.label}</span>
                    <span>{bodyProfile[field.key]} cm</span>
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    value={bodyProfile[field.key]}
                    onChange={(event) => onBodyFieldChange(field.key, Number(event.target.value))}
                    className="w-full accent-[#d2a264]"
                  />
                </label>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]"
              onClick={onBodyReset}
            >
              <RefreshCcw className="h-4 w-4" />
              {copy.resetBody}
            </Button>
          </SectionCard>

          <SectionCard>
            <div className="mb-3 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-[#d2a264]" />
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
          </SectionCard>

          {fitEditPanel}
        </div>
      </div>
    </aside>
  );
}

type StagePanelProps = {
  activeAssets: Asset[];
  avatarId: AvatarPresetId;
  bodyProfile: BodyProfile;
  compact: boolean;
  copy: LabCopy;
  focusAssetId: string | null;
  language: RenewalLanguage;
  layers: GarmentLayerConfig[];
  onSelectAsset: (assetId: string) => void;
  onToggleAsset: (asset: Asset) => void;
  selectedAsset: Asset | null;
  selectedAssetId: string;
  usingDemoRack: boolean;
};

function StagePanel({
  activeAssets,
  avatarId,
  bodyProfile,
  compact,
  copy,
  focusAssetId,
  language,
  layers,
  onSelectAsset,
  onToggleAsset,
  selectedAsset,
  selectedAssetId,
  usingDemoRack,
}: StagePanelProps) {
  return (
    <section className="order-1 min-h-0 overflow-hidden rounded-[32px] border border-white/14 bg-[linear-gradient(180deg,rgba(12,18,26,0.96),rgba(20,27,37,0.9))] shadow-[0_24px_80px_rgba(7,11,17,0.32)] lg:order-2">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.stageTitle}</p>
            <h2 className="mt-2 text-[clamp(1.65rem,2vw,2.3rem)] font-semibold tracking-[-0.05em] text-white">
              {selectedAsset?.name ?? copy.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">{copy.stageHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
              {copy.layerCount(activeAssets.length)}
            </span>
            <Button
              asChild
              variant="outline"
              className={cn(
                'rounded-full border-white/18 bg-white/[0.04] text-white hover:bg-white/[0.1]',
                compact && 'h-10'
              )}
            >
              <Link href="/studio">
                {copy.openStudio}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {usingDemoRack ? (
          <div className="border-b border-[#d2a264]/18 bg-[#d2a264]/10 px-5 py-3 text-sm text-[#f5ddba]">
            <span className="font-semibold">{copy.demoRack}.</span> {copy.demoRackHint}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
          <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_14%,rgba(240,244,250,0.95),rgba(214,221,232,0.48)_52%,rgba(192,199,210,0.2)_100%)]">
            <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
              <span className="rounded-full bg-black/45 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">
                {avatarPresetMap[avatarId].label[language]}
              </span>
              {selectedAsset ? (
                <span className="rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1b2430]">
                  {getClosetCategoryLabel(selectedAsset.category, language)}
                </span>
              ) : null}
            </div>
            <div className="h-full w-full">
              <FittingCanvas3D body={bodyProfile} layers={layers} selectedAssetId={selectedAssetId} avatarId={avatarId} />
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.currentLook}</p>
                <p className="mt-2 text-sm leading-6 text-white/58">{copy.currentLookHint}</p>
              </div>
            </div>

            {activeAssets.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeAssets.map((asset) => {
                  const canToggle = asset.id !== focusAssetId;
                  const selected = asset.id === selectedAssetId;
                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-2',
                        selected ? 'border-[#d2a264]/60 bg-[#d2a264]/12 text-white' : 'border-white/10 bg-black/15 text-white/72'
                      )}
                    >
                      <button type="button" onClick={() => onSelectAsset(asset.id)} className="text-left text-sm font-semibold">
                        {asset.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleAsset(asset)}
                        disabled={!canToggle}
                        className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/68"
                      >
                        {canToggle ? copy.remove : copy.primaryPiece}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/56">{copy.stageEmpty}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type RightPanelProps = {
  activeAssetIdSet: Set<string>;
  category: LibraryCategory;
  copy: LabCopy;
  filteredAssets: Asset[];
  focusAssetId: string | null;
  language: RenewalLanguage;
  onCategoryChange: (category: LibraryCategory) => void;
  onQueryChange: (query: string) => void;
  onSelectAsset: (assetId: string) => void;
  onToggleAsset: (asset: Asset) => void;
  query: string;
  selectedAssetId: string;
  visibleCategories: LibraryCategory[];
};

function RightPanel({
  activeAssetIdSet,
  category,
  copy,
  filteredAssets,
  focusAssetId,
  language,
  onCategoryChange,
  onQueryChange,
  onSelectAsset,
  onToggleAsset,
  query,
  selectedAssetId,
  visibleCategories,
}: RightPanelProps) {
  return (
    <aside className="order-3 min-h-0 overflow-hidden rounded-[28px] border border-white/12 bg-[#131922]/78 shadow-[0_20px_60px_rgba(8,12,18,0.28)] backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{copy.assetLibrary}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{copy.assetLibrary}</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">{copy.assetLibraryHint}</p>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={copy.search}
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d2a264]/55"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleCategories.map((entry) => {
              const Icon = categoryRailIcons[entry] ?? Layers3;
              const label = entry === 'all' ? copy.allCategories : getClosetCategoryLabel(entry, language);
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onCategoryChange(entry)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition',
                    category === entry
                      ? 'border-[#d2a264]/55 bg-[#d2a264]/14 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/66 hover:border-white/18 hover:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {filteredAssets.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 px-4 py-8 text-sm leading-6 text-white/56">{copy.empty}</div>
          ) : (
            filteredAssets.map((asset) => {
              const canToggle = asset.id !== focusAssetId;
              const equipped = activeAssetIdSet.has(asset.id);
              const selected = selectedAssetId === asset.id;
              const isPrimary = focusAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={cn(
                    'rounded-[24px] border p-3 transition',
                    selected
                      ? 'border-[#d2a264]/55 bg-[#d2a264]/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectAsset(asset.id)}
                      className="h-20 w-20 overflow-hidden rounded-[18px] bg-white/90 p-2"
                    >
                      <img src={asset.imageSrc} alt={asset.name} className="h-full w-full object-contain" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button type="button" onClick={() => onSelectAsset(asset.id)} className="truncate text-left text-sm font-semibold text-white">
                            {asset.name}
                          </button>
                          <p className="mt-1 text-xs text-white/52">
                            {getClosetCategoryLabel(asset.category, language)}
                            {asset.brand ? ` · ${asset.brand}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selected ? (
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                              {copy.librarySelected}
                            </span>
                          ) : null}
                          {equipped ? (
                            <span className="rounded-full bg-[#d2a264]/16 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5d1a0]">
                              {copy.equipped}
                            </span>
                          ) : null}
                          {isPrimary ? (
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                              {copy.primaryPiece}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-full border-white/12 bg-white/[0.03] px-3 text-white hover:bg-white/[0.09]"
                          onClick={() => onSelectAsset(asset.id)}
                        >
                          {copy.select}
                        </Button>
                        <Button
                          type="button"
                          variant={equipped ? 'outline' : 'default'}
                          disabled={!canToggle}
                          className={cn(
                            'h-9 rounded-full px-3',
                            equipped
                              ? 'border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.09]'
                              : 'bg-[#d2a264] text-[#1a1511] hover:bg-[#ddb17a]'
                          )}
                          onClick={() => onToggleAsset(asset)}
                        >
                          {canToggle ? (equipped ? copy.remove : copy.equip) : copy.primaryPiece}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

export function ClosetItemFittingLab({ assetId, compact = false }: ClosetItemFittingLabProps) {
  const { language } = useLanguage();
  const uiLanguage: RenewalLanguage = language === 'ko' ? 'ko' : 'en';
  const focusAssetId = assetId?.trim() ? assetId.trim() : null;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LibraryCategory>('all');
  const [activeAssetIds, setActiveAssetIds] = useState<string[]>(focusAssetId ? [focusAssetId] : []);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(focusAssetId ?? '');
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(readSavedAvatarPreset);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(readSavedBodyProfile);
  const [draftMeasurements, setDraftMeasurements] = useState<GarmentMeasurements>({});
  const [draftFitProfile, setDraftFitProfile] = useState<GarmentFitProfile>(fitProfileDefaults);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [usingDemoRack, setUsingDemoRack] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const deferredBodyProfile = useDeferredValue(bodyProfile);
  const copy = buildLabCopy(uiLanguage);

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

        setUsingDemoRack(false);
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

  const activeAssetIdSet = useMemo(() => new Set(activeAssetIds), [activeAssetIds]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? focusAsset ?? activeAssets[0] ?? assets[0] ?? null,
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
    const mergedMeasurements = {
      ...(selectedAsset.metadata?.measurements ?? {}),
      ...draftMeasurements,
    };
    return [
      formatMeasurementLine('Chest', mergedMeasurements.chestCm),
      formatMeasurementLine('Waist', mergedMeasurements.waistCm),
      formatMeasurementLine('Hip', mergedMeasurements.hipCm),
      formatMeasurementLine('Length', mergedMeasurements.lengthCm),
      formatMeasurementLine('Inseam', mergedMeasurements.inseamCm),
    ].filter((entry): entry is string => Boolean(entry));
  }, [draftMeasurements, selectedAsset]);

  const selectedAvatarPreset = avatarPresetMap[avatarId];

  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
  }, []);

  const handleToggleAsset = useCallback(
    (nextAsset: Asset) => {
      setSelectedAssetId(nextAsset.id);
      if (focusAssetId && nextAsset.id === focusAssetId) return;

      setActiveAssetIds((prev) =>
        prev.includes(nextAsset.id) ? prev.filter((id) => id !== nextAsset.id) : [...prev, nextAsset.id]
      );
    },
    [focusAssetId]
  );

  const handleBodyFieldChange = useCallback((key: BodyFieldKey, value: number) => {
    setBodyProfile((prev: BodyProfile) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleMeasurementChange = useCallback((key: MeasurementFieldKey, value: string) => {
    const nextValue = value.trim();
    setDraftMeasurements((prev: GarmentMeasurements) => ({
      ...prev,
      [key]: nextValue.length === 0 ? undefined : Number(nextValue),
    }));
  }, []);

  const handleFitProfileChange = useCallback((updates: Partial<GarmentFitProfile>) => {
    setDraftFitProfile((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const handleSaveAssetMetadata = useCallback(() => {
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
  }, [copy.saveError, draftFitProfile, draftMeasurements, selectedAsset]);

  const fitEditPanel = (
    <FitEditPanel
      assets={assets}
      copy={copy}
      draftFitProfile={draftFitProfile}
      draftMeasurements={draftMeasurements}
      isSaving={isSaving}
      onFitProfileChange={handleFitProfileChange}
      onMeasurementChange={handleMeasurementChange}
      onSave={handleSaveAssetMetadata}
      saveError={saveError}
      selectedAsset={selectedAsset}
    />
  );

  const workspace = (
    <div
      className={cn(
        'relative mx-auto w-full overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#59606d_0%,#717887_22%,#9098a6_48%,#c0c6cf_100%)] text-white',
        compact ? 'min-h-screen rounded-none lg:h-screen' : 'min-h-[820px] lg:h-[min(860px,calc(100vh-13rem))]'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.32),rgba(255,255,255,0.06)_42%,transparent_76%)]" />
      <div className="relative z-10 grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:p-5">
        <LeftPanel
          avatarId={avatarId}
          bodyProfile={bodyProfile}
          copy={copy}
          focusAssetId={focusAssetId}
          language={uiLanguage}
          onAvatarChange={setAvatarId}
          onBodyFieldChange={handleBodyFieldChange}
          onBodyReset={() => setBodyProfile(defaultBodyProfile)}
          selectedAsset={selectedAsset}
          selectedAvatarPreset={selectedAvatarPreset}
          selectedLayer={selectedLayer}
          selectedMeasurementSummary={selectedMeasurementSummary}
          fitEditPanel={fitEditPanel}
        />
        <StagePanel
          activeAssets={activeAssets}
          avatarId={avatarId}
          bodyProfile={deferredBodyProfile}
          compact={compact}
          copy={copy}
          focusAssetId={focusAssetId}
          language={uiLanguage}
          layers={layers}
          onSelectAsset={handleSelectAsset}
          onToggleAsset={handleToggleAsset}
          selectedAsset={selectedAsset}
          selectedAssetId={selectedAssetId}
          usingDemoRack={usingDemoRack}
        />
        <RightPanel
          activeAssetIdSet={activeAssetIdSet}
          category={category}
          copy={copy}
          filteredAssets={filteredAssets}
          focusAssetId={focusAssetId}
          language={uiLanguage}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
          onSelectAsset={handleSelectAsset}
          onToggleAsset={handleToggleAsset}
          query={query}
          selectedAssetId={selectedAssetId}
          visibleCategories={visibleCategories}
        />
      </div>
    </div>
  );

  const renderFrame = (content: ReactNode) => {
    if (compact) return content;

    const title = focusAsset ? (uiLanguage === 'ko' ? `${focusAsset.name} 피팅 랩` : `${focusAsset.name} Fitting Lab`) : copy.title;
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

'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { getClosetCategoryLabel } from '@/features/renewal-app/data';
import {
  avatarStorageKey,
  parseAvatarPresetId,
  type AvatarPresetId,
} from '@/features/shared-3d/avatarPresets';
import {
  normalizeBodyProfile,
  type Asset,
  type BodyProfile,
} from '@freestyle/contracts/domain-types';
import { apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toAsset } from '@/features/studio/utils';
import styles from './ClosetItemFittingLab.module.css';
import {
  avatarGenderMap,
  defaultDemoClosetAssetId,
  defaultDemoEquippedBySlot,
  demoClosetAssets,
  genderAvatarMap,
  genderBaseMeasurements,
  isWearableCategory,
  posePresets,
  resolveGarmentTemplate,
  type BodyGender,
  type FittingPoseId,
  type WearableCategory,
  wearableCategories,
} from './closetSceneConfig';

const FittingCanvas3D = dynamic(
  () => import('./FittingCanvas3D').then((module) => module.FittingCanvas3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-black/10" />
    ),
  }
);

const bodyStorageKey = 'freestyle:mannequin-body-profile';
const sceneStorageKey = 'freestyle:closet-scene-state';
const DEFAULT_BG = '#d8dbdf';
const CM_PER_INCH = 2.54;

const bodyFieldOrder = [
  { key: 'heightCm', label: { ko: '키', en: 'Height' }, min: 150, max: 198, unit: 'cm', unitInch: 'in' },
  { key: 'shoulderCm', label: { ko: '어깨', en: 'Shoulder' }, min: 36, max: 56, unit: 'cm', unitInch: 'in' },
  { key: 'chestCm', label: { ko: '가슴', en: 'Chest' }, min: 74, max: 128, unit: 'cm', unitInch: 'in' },
  { key: 'waistCm', label: { ko: '허리', en: 'Waist' }, min: 56, max: 120, unit: 'cm', unitInch: 'in' },
  { key: 'hipCm', label: { ko: '힙', en: 'Hip' }, min: 78, max: 132, unit: 'cm', unitInch: 'in' },
  { key: 'inseamCm', label: { ko: '다리 길이', en: 'Leg length' }, min: 68, max: 94, unit: 'cm', unitInch: 'in' },
] as const;

type BodyFieldKey = (typeof bodyFieldOrder)[number]['key'];
type BodySimple = BodyProfile['simple'];
type UnitSystem = 'cm' | 'inch';
type BrowserTab = 'mannequin' | 'pose' | WearableCategory;

type StoredSceneState = {
  activeCategory?: WearableCategory;
  avatarId?: AvatarPresetId;
  equippedBySlot?: Partial<Record<WearableCategory, string>>;
  poseId?: FittingPoseId;
  selectedAssetId?: string;
};

type BrowserCopy = {
  activeLabel: string;
  all: string;
  allClothing: string;
  apply: string;
  autoContrast: string;
  backgroundTheme: string;
  basicPose: string;
  browseTitle: string;
  casualPose: string;
  close: string;
  coat: string;
  createAZoi: string;
  customize: string;
  demoRack: string;
  demoRackHint: string;
  directPick: string;
  empty: string;
  exit: string;
  female: string;
  femaleOnly: string;
  fittingPose: string;
  hex: string;
  loading: string;
  loadError: string;
  male: string;
  maleOnly: string;
  mannequin: string;
  mannequinModalTitle: string;
  noItems: string;
  outerwear: string;
  pants: string;
  pose: string;
  preset: string;
  recommended: string;
  reset: string;
  retry: string;
  save: string;
  saved: string;
  shirts: string;
  shoes: string;
  shorts: string;
  slotSummary: string;
  stageTitle: string;
  status: string;
  styleEdit: string;
  tops: string;
  unitCm: string;
  unitInch: string;
};

type MannequinCard = {
  id: string;
  avatarId: AvatarPresetId;
  gender: BodyGender;
  title: string;
  subtitle: string;
  bodySimple: BodySimple;
};

type BrowserCard =
  | {
      id: string;
      kind: 'mannequin';
      title: string;
      subtitle: string;
      thumbClass: string;
      mannequin: MannequinCard;
    }
  | {
      id: string;
      kind: 'pose';
      title: string;
      subtitle: string;
      thumbClass: string;
      poseId: FittingPoseId;
    }
  | {
      id: string;
      kind: 'asset';
      title: string;
      subtitle: string;
      thumbClass: string;
      thumbStyle?: CSSProperties;
      category: WearableCategory;
      asset: Asset;
    };

type SubcategoryOption = {
  id: string;
  label: string;
};

const railOrder: BrowserTab[] = ['mannequin', 'pose', 'tops', 'outerwear', 'bottoms', 'shoes'];

const railShortLabel: Record<BrowserTab, string> = {
  mannequin: 'M',
  pose: 'P',
  tops: 'T',
  outerwear: 'O',
  bottoms: 'B',
  shoes: 'S',
};

const defaultMannequinCardByGender: Record<BodyGender, string> = {
  female: 'female_standard',
  male: 'male_standard',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toDisplay = (cm: number, unit: UnitSystem) =>
  unit === 'inch' ? cm / CM_PER_INCH : cm;

const fromDisplay = (value: number, unit: UnitSystem) =>
  unit === 'inch' ? value * CM_PER_INCH : value;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 216, g: 219, b: 223 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgba = (
  { r, g, b }: { r: number; g: number; b: number },
  alpha: number
) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;

const mixRgb = (
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  ratio: number
) => ({
  r: a.r + (b.r - a.r) * ratio,
  g: a.g + (b.g - a.g) * ratio,
  b: a.b + (b.b - a.b) * ratio,
});

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const [R, G, B] = [transform(r), transform(g), transform(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case nr:
      h = (ng - nb) / d + (ng < nb ? 6 : 0);
      break;
    case ng:
      h = (nb - nr) / d + 2;
      break;
    default:
      h = (nr - ng) / d + 4;
      break;
  }

  h /= 6;
  return { h, s, l };
};

const hue2rgb = (p: number, q: number, t: number) => {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
};

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }) => {
  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
};

const normalizeHex = (raw: string) => {
  const sanitized = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  if (sanitized.length !== 6) return null;
  return `#${sanitized.toLowerCase()}`;
};

const buildTheme = (hex: string) => {
  const base = hexToRgb(hex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 12, g: 16, b: 22 };
  const isLight = luminance(base) > 0.46;
  const baseHsl = rgbToHsl(base);
  const accent = hslToRgb({
    h: (baseHsl.h + (isLight ? 0.06 : 0.04)) % 1,
    s: clamp(Math.max(baseHsl.s, 0.14) + 0.12, 0.2, 0.72),
    l: isLight ? 0.42 : 0.7,
  });

  const start = isLight ? mixRgb(base, white, 0.1) : mixRgb(base, black, 0.42);
  const end = isLight ? mixRgb(base, black, 0.12) : mixRgb(base, black, 0.56);
  const panelLight = isLight ? mixRgb(base, white, 0.52) : mixRgb(base, white, 0.1);
  const panelDark = isLight ? mixRgb(base, black, 0.18) : mixRgb(base, black, 0.34);
  const textPrimary = isLight ? mixRgb(base, black, 0.96) : mixRgb(base, white, 0.98);
  const textSecondary = isLight ? mixRgb(base, black, 0.84) : mixRgb(base, white, 0.92);
  const textMuted = isLight ? mixRgb(base, black, 0.62) : mixRgb(base, white, 0.68);
  const accentBg = isLight ? mixRgb(accent, white, 0.74) : mixRgb(accent, black, 0.4);
  const accentStroke = isLight ? mixRgb(accent, black, 0.26) : mixRgb(accent, white, 0.28);
  const accentText = isLight ? mixRgb(accent, black, 0.56) : mixRgb(accent, white, 0.94);

  return {
    '--app-bg-start': rgbToHex(start),
    '--app-bg-end': rgbToHex(end),
    '--text-primary': rgbToHex(textPrimary),
    '--text-secondary': rgbToHex(textSecondary),
    '--text-muted': rgbToHex(textMuted),
    '--button-bg': isLight ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)',
    '--button-hover': isLight ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.16)',
    '--button-border': rgba(panelDark, isLight ? 0.14 : 0.26),
    '--input-bg': isLight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)',
    '--input-border': rgba(panelDark, isLight ? 0.14 : 0.22),
    '--panel-glass-outer': rgba(panelLight, isLight ? 0.18 : 0.1),
    '--panel-glass-inner': rgba(panelLight, isLight ? 0.08 : 0.04),
    '--panel-highlight': rgba(white, isLight ? 0.18 : 0.12),
    '--panel-shadow': isLight ? 'rgba(12,18,24,0.16)' : 'rgba(0,0,0,0.26)',
    '--panel-divider': rgba(white, isLight ? 0.32 : 0.16),
    '--accent-bg': rgba(accentBg, isLight ? 0.58 : 0.42),
    '--accent-border': rgba(accentStroke, isLight ? 0.62 : 0.56),
    '--accent-text': rgbToHex(accentText),
    '--accent-solid': rgbToHex(accentStroke),
    '--accent-glow': rgba(accent, isLight ? 0.22 : 0.28),
    '--scene-halo': rgba(accent, isLight ? 0.1 : 0.18),
    '--modal-backdrop': isLight ? 'rgba(10,14,20,0.24)' : 'rgba(0,0,0,0.62)',
    '--thumb-bg': isLight ? 'rgba(232, 237, 244, 0.82)' : 'rgba(200, 210, 224, 0.14)',
  } as CSSProperties;
};

const buildBodyProfileFromGender = (gender: BodyGender): BodyProfile => ({
  simple: { ...genderBaseMeasurements[gender] },
  detailed: {},
});

const clampBodySimple = (simple: BodySimple): BodySimple =>
  bodyFieldOrder.reduce((next, field) => {
    next[field.key] = clamp(simple[field.key], field.min, field.max);
    return next;
  }, { ...simple });

const withMeasurements = (
  gender: BodyGender,
  delta: Partial<Record<BodyFieldKey, number>>
): BodySimple => {
  const base = { ...genderBaseMeasurements[gender] };
  return clampBodySimple({
    ...base,
    heightCm: base.heightCm + (delta.heightCm ?? 0),
    shoulderCm: base.shoulderCm + (delta.shoulderCm ?? 0),
    chestCm: base.chestCm + (delta.chestCm ?? 0),
    waistCm: base.waistCm + (delta.waistCm ?? 0),
    hipCm: base.hipCm + (delta.hipCm ?? 0),
    inseamCm: base.inseamCm + (delta.inseamCm ?? 0),
  });
};

const readSavedBodyProfile = () => {
  if (typeof window === 'undefined') return buildBodyProfileFromGender('female');
  try {
    const raw = window.localStorage.getItem(bodyStorageKey);
    if (!raw) return buildBodyProfileFromGender('female');
    return normalizeBodyProfile(JSON.parse(raw));
  } catch {
    return buildBodyProfileFromGender('female');
  }
};

const readSavedAvatarPreset = () => {
  if (typeof window === 'undefined') return 'muse' as AvatarPresetId;
  try {
    return parseAvatarPresetId(window.localStorage.getItem(avatarStorageKey));
  } catch {
    return 'muse' as AvatarPresetId;
  }
};

const readSavedSceneState = (): StoredSceneState => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(sceneStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredSceneState;
    return {
      activeCategory: parsed.activeCategory,
      avatarId: parsed.avatarId ? parseAvatarPresetId(parsed.avatarId) : undefined,
      equippedBySlot: parsed.equippedBySlot,
      poseId: parsed.poseId,
      selectedAssetId: parsed.selectedAssetId,
    };
  } catch {
    return {};
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

const resolvePrimaryAssets = (
  assets: Asset[],
  focusAssetId: string | null,
  previousScene: StoredSceneState
): {
  activeCategory: WearableCategory;
  equippedBySlot: Partial<Record<WearableCategory, string>>;
  selectedAssetId: string;
} => {
  const availableByCategory = Object.fromEntries(
    wearableCategories.map((category) => [
      category,
      assets.filter((asset) => asset.category === category),
    ])
  ) as Record<WearableCategory, Asset[]>;

  const focusAsset = focusAssetId
    ? assets.find((asset) => asset.id === focusAssetId) ?? null
    : null;
  const nextEquipped: Partial<Record<WearableCategory, string>> = {};

  wearableCategories.forEach((category) => {
    const preferredId = previousScene.equippedBySlot?.[category];
    const categoryAssets = availableByCategory[category];

    if (preferredId && categoryAssets.some((asset) => asset.id === preferredId)) {
      nextEquipped[category] = preferredId;
      return;
    }

    if (focusAsset && focusAsset.category === category) {
      nextEquipped[category] = focusAsset.id;
      return;
    }

    nextEquipped[category] = categoryAssets[0]?.id;
  });

  const selectedCandidate =
    previousScene.selectedAssetId &&
    assets.some((asset) => asset.id === previousScene.selectedAssetId)
      ? previousScene.selectedAssetId
      : focusAsset?.id ??
        nextEquipped[previousScene.activeCategory ?? 'outerwear'] ??
        nextEquipped.outerwear ??
        nextEquipped.tops ??
        '';

  const activeCategory = (() => {
    const selectedAsset =
      assets.find((asset) => asset.id === selectedCandidate) ?? focusAsset ?? null;
    if (selectedAsset && isWearableCategory(selectedAsset.category)) {
      return selectedAsset.category;
    }

    if (
      previousScene.activeCategory &&
      availableByCategory[previousScene.activeCategory].length > 0
    ) {
      return previousScene.activeCategory;
    }

    return (
      wearableCategories.find((category) => availableByCategory[category].length > 0) ??
      'tops'
    );
  })();

  return {
    activeCategory,
    equippedBySlot: nextEquipped,
    selectedAssetId: selectedCandidate,
  };
};

const thumbClassForId = (id: string) => id.replace(/[^a-z0-9_]/gi, '_');

const orbStyleFromImage = (imageSrc?: string): CSSProperties | undefined => {
  if (!imageSrc) return undefined;
  return {
    backgroundImage: `radial-gradient(circle at 50% 22%, rgba(255,255,255,0.9), rgba(255,255,255,0.24) 58%, rgba(255,255,255,0.08) 100%), url("${imageSrc}")`,
    backgroundSize: 'cover, cover',
    backgroundPosition: 'center, center',
  };
};

const buildCopy = (language: 'ko' | 'en'): BrowserCopy =>
  language === 'ko'
    ? {
        activeLabel: '선택 중',
        all: '전체',
        allClothing: '전체',
        apply: '적용',
        autoContrast: '대비 자동 적용',
        backgroundTheme: '배경 테마',
        basicPose: '기본',
        browseTitle: 'Outfit',
        casualPose: '캐주얼',
        close: '닫기',
        coat: '코트',
        createAZoi: 'CREATE A ZOI',
        customize: '마네킹 커스텀',
        demoRack: '데모 랙',
        demoRackHint: 'API가 비어 있어도 로컬 starter pack으로 계속 피팅됩니다.',
        directPick: '직접 선택',
        empty: '이 카테고리에는 표시할 아이템이 없습니다.',
        exit: '나가기',
        female: '여성',
        femaleOnly: '여성',
        fittingPose: '피팅',
        hex: 'HEX',
        loading: '옷장 스테이지를 준비하는 중...',
        loadError: '옷장 스테이지를 불러오지 못했습니다.',
        male: '남성',
        maleOnly: '남성',
        mannequin: '마네킹',
        mannequinModalTitle: '마네킹 커스텀',
        noItems: '표시할 아이템이 없습니다.',
        outerwear: '외투',
        pants: '팬츠',
        pose: '포즈',
        preset: 'Preset',
        recommended: '추천',
        reset: '리셋',
        retry: '다시 시도',
        save: '저장',
        saved: '저장됨',
        shirts: '셔츠',
        shoes: '신발',
        shorts: '쇼츠',
        slotSummary: '현재 상태',
        stageTitle: '스타일 편집',
        status: '현재 상태',
        styleEdit: '스타일 편집',
        tops: '상의',
        unitCm: 'CM',
        unitInch: 'INCH',
      }
    : {
        activeLabel: 'Active',
        all: 'All',
        allClothing: 'All',
        apply: 'Apply',
        autoContrast: 'Auto contrast',
        backgroundTheme: 'Background theme',
        basicPose: 'Base',
        browseTitle: 'Outfit',
        casualPose: 'Casual',
        close: 'Close',
        coat: 'Coats',
        createAZoi: 'CREATE A ZOI',
        customize: 'Customize mannequin',
        demoRack: 'Demo rack',
        demoRackHint: 'The local starter pack keeps fitting usable when the API is empty.',
        directPick: 'Direct pick',
        empty: 'No items are available in this category.',
        exit: 'Exit',
        female: 'Female',
        femaleOnly: 'Female',
        fittingPose: 'Fitting',
        hex: 'HEX',
        loading: 'Preparing the closet stage...',
        loadError: 'Failed to load the closet stage.',
        male: 'Male',
        maleOnly: 'Male',
        mannequin: 'Mannequin',
        mannequinModalTitle: 'Customize mannequin',
        noItems: 'No items available.',
        outerwear: 'Outerwear',
        pants: 'Pants',
        pose: 'Pose',
        preset: 'Preset',
        recommended: 'Recommended',
        reset: 'Reset',
        retry: 'Retry',
        save: 'Save',
        saved: 'Saved',
        shirts: 'Shirts',
        shoes: 'Shoes',
        shorts: 'Shorts',
        slotSummary: 'Current state',
        stageTitle: 'Style Edit',
        status: 'Current state',
        styleEdit: 'Style Edit',
        tops: 'Tops',
        unitCm: 'CM',
        unitInch: 'INCH',
      };

const buildTabMeta = (copy: BrowserCopy, language: 'ko' | 'en') =>
  ({
    mannequin: {
      title: copy.mannequin,
      rail: copy.mannequin,
      label: copy.mannequin,
    },
    pose: {
      title: copy.pose,
      rail: copy.pose,
      label: copy.pose,
    },
    tops: {
      title: copy.tops,
      rail: copy.tops,
      label: copy.tops,
    },
    outerwear: {
      title: copy.outerwear,
      rail: copy.outerwear,
      label: copy.outerwear,
    },
    bottoms: {
      title: getClosetCategoryLabel('bottoms', language),
      rail: copy.pants,
      label: getClosetCategoryLabel('bottoms', language),
    },
    shoes: {
      title: copy.shoes,
      rail: copy.shoes,
      label: copy.shoes,
    },
  }) satisfies Record<BrowserTab, { title: string; rail: string; label: string }>;

const buildSubcategories = (copy: BrowserCopy) =>
  ({
    mannequin: [
      { id: 'all', label: copy.all },
      { id: 'female', label: copy.femaleOnly },
      { id: 'male', label: copy.maleOnly },
      { id: 'recommended', label: copy.recommended },
    ],
    pose: [
      { id: 'all', label: copy.all },
      { id: 'base', label: copy.basicPose },
      { id: 'casual', label: copy.casualPose },
      { id: 'fitting', label: copy.fittingPose },
    ],
    tops: [
      { id: 'all', label: copy.allClothing },
      { id: 'shirts', label: copy.shirts },
      { id: 'tees', label: 'T-Shirts' },
    ],
    outerwear: [
      { id: 'all', label: copy.allClothing },
      { id: 'bombers', label: 'Bombers' },
      { id: 'blazers', label: 'Blazers' },
      { id: 'coats', label: copy.coat },
    ],
    bottoms: [
      { id: 'all', label: copy.allClothing },
      { id: 'pants', label: copy.pants },
      { id: 'shorts', label: copy.shorts },
    ],
    shoes: [
      { id: 'all', label: copy.allClothing },
      { id: 'sneakers', label: 'Sneakers' },
      { id: 'boots', label: 'Boots' },
      { id: 'runners', label: 'Runners' },
    ],
  }) satisfies Record<BrowserTab, SubcategoryOption[]>;

function TopControls({
  onExit,
  onReset,
  onSave,
  copy,
  saveLabel,
}: {
  copy: BrowserCopy;
  onExit: () => void;
  onReset: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className={styles.topControls}>
      <button type="button" className={styles.topButton} onClick={onExit}>
        {copy.exit}
      </button>
      <div className={styles.topActions}>
        <button type="button" className={styles.topButton} onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          {copy.reset}
        </button>
        <button
          type="button"
          className={cn(styles.topButton, styles.topButtonPrimary)}
          onClick={onSave}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function LeftPanel({
  backgroundColor,
  copy,
  onBackgroundChange,
  onCustomize,
  statusDetail,
  statusTitle,
}: {
  backgroundColor: string;
  copy: BrowserCopy;
  onBackgroundChange: (value: string) => void;
  onCustomize: () => void;
  statusDetail: string;
  statusTitle: string;
}) {
  const handleHexChange = (value: string) => {
    const normalized = normalizeHex(value);
    if (normalized) {
      onBackgroundChange(normalized);
    }
  };

  return (
    <section className={cn(styles.overlayPanel, styles.glassPanel, styles.leftPanel)}>
      <div className={styles.leftTitle}>
        <div className={styles.eyebrow}>{copy.createAZoi}</div>
        <h1>{copy.styleEdit}</h1>
      </div>

      <div className={cn(styles.leftSection, styles.subtleSurface)}>
        <div className={styles.sectionTitleRow}>
          <strong>{copy.backgroundTheme}</strong>
          <span>{copy.autoContrast}</span>
        </div>
        <div className={styles.themeGrid}>
          <label className={styles.themeField}>
            <span>{copy.directPick}</span>
            <input
              type="color"
              value={backgroundColor}
              onChange={(event) => onBackgroundChange(event.target.value)}
            />
          </label>
          <label className={styles.themeField}>
            <span>{copy.hex}</span>
            <input
              value={backgroundColor.toUpperCase()}
              maxLength={7}
              onChange={(event) => handleHexChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <button type="button" className={styles.heroButton} onClick={onCustomize}>
        {copy.customize}
      </button>

      <div className={styles.leftBottomSpacer} />

      <div className={cn(styles.statusPanel, styles.subtleSurface)}>
        <span className={styles.miniLabel}>{copy.status}</span>
        <strong>{statusTitle}</strong>
        <small>{statusDetail}</small>
      </div>
    </section>
  );
}

function MeasurementModal({
  bodyProfile,
  copy,
  currentGender,
  mannequinCards,
  onBodyFieldChange,
  onClose,
  onGenderChange,
  onPickMannequin,
  onPoseChange,
  open,
  poseId,
  uiLanguage,
  unit,
  onUnitChange,
}: {
  bodyProfile: BodyProfile;
  copy: BrowserCopy;
  currentGender: BodyGender;
  mannequinCards: MannequinCard[];
  onBodyFieldChange: (key: BodyFieldKey, value: number) => void;
  onClose: () => void;
  onGenderChange: (gender: BodyGender) => void;
  onPickMannequin: (card: MannequinCard) => void;
  onPoseChange: (poseId: FittingPoseId) => void;
  open: boolean;
  poseId: FittingPoseId;
  uiLanguage: 'ko' | 'en';
  unit: UnitSystem;
  onUnitChange: (nextUnit: UnitSystem) => void;
}) {
  if (!open) return null;

  const visiblePresets = mannequinCards.filter((card) => card.gender === currentGender);

  return (
    <div className={styles.modalRoot}>
      <div className={styles.modalPanel}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalEyebrow}>{copy.customize}</div>
            <h2>{copy.mannequinModalTitle}</h2>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            {copy.close}
          </button>
        </div>

        <div className={styles.modalToolbar}>
          <div className={styles.modalToolbarSplit}>
            <div className={styles.segmentedSwitch}>
              <button
                type="button"
                className={cn(currentGender === 'female' && styles.activePill)}
                onClick={() => onGenderChange('female')}
              >
                {copy.female}
              </button>
              <button
                type="button"
                className={cn(currentGender === 'male' && styles.activePill)}
                onClick={() => onGenderChange('male')}
              >
                {copy.male}
              </button>
            </div>
            <div className={styles.unitSwitch}>
              <button
                type="button"
                className={cn(unit === 'cm' && styles.activePill)}
                onClick={() => onUnitChange('cm')}
              >
                {copy.unitCm}
              </button>
              <button
                type="button"
                className={cn(unit === 'inch' && styles.activePill)}
                onClick={() => onUnitChange('inch')}
              >
                {copy.unitInch}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.presetGrid}>
          {visiblePresets.map((card) => (
            <button
              key={card.id}
              type="button"
              className={styles.presetCard}
              onClick={() => onPickMannequin(card)}
            >
              <strong>{card.title}</strong>
              <span>
                {bodyFieldOrder[0].label.ko} {card.bodySimple.heightCm} ·
                {' '}
                {bodyFieldOrder[1].label.ko} {card.bodySimple.shoulderCm} ·
                {' '}
                {bodyFieldOrder[3].label.ko} {card.bodySimple.waistCm}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.modalToolbar}>
          <div className={styles.poseStrip}>
            {posePresets.map((pose) => (
              <button
                key={pose.id}
                type="button"
                className={cn(styles.ghostPill, poseId === pose.id && styles.activePill)}
                onClick={() => onPoseChange(pose.id)}
              >
                {pose.label[uiLanguage]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.modalFieldList}>
          {bodyFieldOrder.map((field) => {
            const displayValue = Number(
              toDisplay(bodyProfile.simple[field.key], unit).toFixed(unit === 'cm' ? 1 : 2)
            );

            return (
              <div key={field.key} className={styles.fieldCard}>
                <div className={styles.fieldHead}>
                  <span>{field.label[uiLanguage]}</span>
                  <span className={styles.fieldRange}>
                    {field.min}–{field.max} {unit === 'cm' ? field.unit : field.unitInch}
                  </span>
                </div>
                <div className={styles.fieldInputRow}>
                  <input
                    type="number"
                    min={unit === 'cm' ? field.min : Number((field.min / CM_PER_INCH).toFixed(1))}
                    max={unit === 'cm' ? field.max : Number((field.max / CM_PER_INCH).toFixed(1))}
                    step={unit === 'cm' ? 1 : 0.1}
                    value={displayValue}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      if (Number.isNaN(nextValue)) return;
                      onBodyFieldChange(
                        field.key,
                        clamp(fromDisplay(nextValue, unit), field.min, field.max)
                      );
                    }}
                  />
                  <span className={styles.fieldUnit}>
                    {unit === 'cm' ? field.unit : field.unitInch}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AssetPanel({
  activeTab,
  cards,
  copy,
  onCardPick,
  onSubcategoryChange,
  onTabChange,
  selectedId,
  subcategories,
  subcategoryId,
  tabMeta,
  usingDemoRack,
}: {
  activeTab: BrowserTab;
  cards: BrowserCard[];
  copy: BrowserCopy;
  onCardPick: (card: BrowserCard) => void;
  onSubcategoryChange: (id: string) => void;
  onTabChange: (tab: BrowserTab) => void;
  selectedId: string | null;
  subcategories: SubcategoryOption[];
  subcategoryId: string;
  tabMeta: Record<BrowserTab, { title: string; rail: string; label: string }>;
  usingDemoRack: boolean;
}) {
  return (
    <section className={cn(styles.overlayPanel, styles.glassPanel, styles.rightPanel)}>
      <div className={styles.outfitTopline}>{copy.browseTitle}</div>
      <div className={styles.outfitTitle}>{tabMeta[activeTab].title}</div>

      <div className={styles.referenceBrowser}>
        <div className={styles.verticalRail}>
          {railOrder.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(styles.railRow, activeTab === tab && styles.railRowActive)}
              onClick={() => onTabChange(tab)}
            >
              <span className={styles.railIcon}>{railShortLabel[tab]}</span>
              <span className={styles.railLabel}>{tabMeta[tab].label}</span>
            </button>
          ))}
        </div>

        <div className={styles.subcategoryColumn}>
          <div className={styles.subcategoryTitle}>{tabMeta[activeTab].rail}</div>
          {subcategories.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                styles.subcategoryPill,
                subcategoryId === option.id && styles.subcategoryPillActive
              )}
              onClick={() => onSubcategoryChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.assetColumn}>
          <div className={styles.assetToolbar}>
            <button type="button" className={styles.toolbarText}>
              {usingDemoRack ? copy.demoRack : activeTab === 'mannequin' ? copy.preset : copy.apply}
            </button>
            <div className={styles.toolbarIcons}>
              <span className={styles.toolbarDot} />
              <span className={cn(styles.toolbarDot, styles.toolbarDotAlt)} />
              <span className={styles.toolbarFilter}>{cards.length}</span>
            </div>
          </div>

          {cards.length > 0 ? (
            <div className={styles.assetGrid}>
              {cards.map((card) => {
                const thumbStyle =
                  card.kind === 'asset' ? card.thumbStyle : undefined;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={cn(
                      styles.assetTile,
                      selectedId === card.id && styles.assetTileSelected
                    )}
                    onClick={() => onCardPick(card)}
                  >
                    <div className={styles.assetOrbWrap}>
                      <div
                        className={cn(
                          styles.assetOrb,
                          card.thumbClass ? styles[card.thumbClass] : undefined
                        )}
                        style={thumbStyle}
                      />
                    </div>
                    <div className={cn(styles.assetCopy, styles.referenceCopy)}>
                      <strong>{card.title}</strong>
                      <small>{card.subtitle}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={cn(styles.subtleSurface, 'rounded-[24px] px-4 py-6 text-sm text-[color:var(--text-muted)]')}>
              {copy.noItems}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ClosetItemFittingLab({
  assetId,
}: {
  assetId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const uiLanguage = language === 'ko' ? 'ko' : 'en';
  const copy = useMemo(() => buildCopy(uiLanguage), [uiLanguage]);
  const tabMeta = useMemo(() => buildTabMeta(copy, uiLanguage), [copy, uiLanguage]);
  const subcategoryMeta = useMemo(() => buildSubcategories(copy), [copy]);
  const focusAssetId = assetId?.trim() ? assetId.trim() : null;
  const savedScene = useMemo(readSavedSceneState, []);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoRack, setUsingDemoRack] = useState(false);
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(
    savedScene.avatarId ?? readSavedAvatarPreset
  );
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(readSavedBodyProfile);
  const [activeCategory, setActiveCategory] = useState<WearableCategory>(
    savedScene.activeCategory ?? 'outerwear'
  );
  const [activeTab, setActiveTab] = useState<BrowserTab>(
    savedScene.activeCategory ?? 'outerwear'
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    savedScene.selectedAssetId ?? focusAssetId ?? defaultDemoClosetAssetId
  );
  const [equippedBySlot, setEquippedBySlot] = useState<
    Partial<Record<WearableCategory, string>>
  >(savedScene.equippedBySlot ?? defaultDemoEquippedBySlot);
  const [poseId, setPoseId] = useState<FittingPoseId>(savedScene.poseId ?? 'apose');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [unit, setUnit] = useState<UnitSystem>('cm');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [selectedMannequinCardId, setSelectedMannequinCardId] = useState(
    defaultMannequinCardByGender[avatarGenderMap[savedScene.avatarId ?? readSavedAvatarPreset()] ?? 'female']
  );

  const currentGender = avatarGenderMap[avatarId] ?? 'female';

  const mannequinCards = useMemo<MannequinCard[]>(
    () => [
      {
        id: 'female_standard',
        avatarId: 'muse',
        gender: 'female',
        title: uiLanguage === 'ko' ? '베이직 실루엣' : 'Female Standard',
        subtitle: uiLanguage === 'ko' ? '기본 여성 rig' : 'Baseline feminine rig',
        bodySimple: withMeasurements('female', {}),
      },
      {
        id: 'female_slim',
        avatarId: 'muse',
        gender: 'female',
        title: uiLanguage === 'ko' ? '슬림 실루엣' : 'Female Slim',
        subtitle: uiLanguage === 'ko' ? '가벼운 어깨와 허리' : 'Narrow shoulder and waist',
        bodySimple: withMeasurements('female', {
          heightCm: -2,
          shoulderCm: -2,
          chestCm: -4,
          waistCm: -6,
          hipCm: -4,
          inseamCm: -1,
        }),
      },
      {
        id: 'female_tall',
        avatarId: 'muse',
        gender: 'female',
        title: uiLanguage === 'ko' ? '롱 실루엣' : 'Female Tall',
        subtitle: uiLanguage === 'ko' ? '긴 다리와 세로 비율' : 'Longer inseam and height',
        bodySimple: withMeasurements('female', {
          heightCm: 8,
          shoulderCm: 1,
          chestCm: 2,
          waistCm: -2,
          hipCm: 2,
          inseamCm: 7,
        }),
      },
      {
        id: 'male_standard',
        avatarId: 'operator',
        gender: 'male',
        title: uiLanguage === 'ko' ? '스탠다드 프레임' : 'Male Standard',
        subtitle: uiLanguage === 'ko' ? '기본 남성 rig' : 'Baseline masculine rig',
        bodySimple: withMeasurements('male', {}),
      },
      {
        id: 'male_slim',
        avatarId: 'operator',
        gender: 'male',
        title: uiLanguage === 'ko' ? '슬림 테일러' : 'Male Slim',
        subtitle: uiLanguage === 'ko' ? '폭을 줄인 프레임' : 'Trimmed width and waist',
        bodySimple: withMeasurements('male', {
          heightCm: -3,
          shoulderCm: -2,
          chestCm: -6,
          waistCm: -5,
          hipCm: -3,
          inseamCm: -2,
        }),
      },
      {
        id: 'male_broad',
        avatarId: 'operator',
        gender: 'male',
        title: uiLanguage === 'ko' ? '브로드 프레임' : 'Male Broad',
        subtitle: uiLanguage === 'ko' ? '넓은 어깨와 상체' : 'Wider shoulder and chest',
        bodySimple: withMeasurements('male', {
          heightCm: 4,
          shoulderCm: 4,
          chestCm: 10,
          waistCm: 6,
          hipCm: 4,
          inseamCm: 3,
        }),
      },
    ],
    [uiLanguage]
  );

  const activateDemoRack = useCallback(() => {
    const previousScene = readSavedSceneState();
    setUsingDemoRack(true);
    setAssets(demoClosetAssets);
    const nextState = resolvePrimaryAssets(demoClosetAssets, focusAssetId, previousScene);
    setActiveCategory(nextState.activeCategory);
    setActiveTab(nextState.activeCategory);
    setEquippedBySlot(nextState.equippedBySlot);
    setSelectedAssetId(nextState.selectedAssetId || defaultDemoClosetAssetId);
  }, [focusAssetId]);

  const loadLab = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const previousScene = readSavedSceneState();

      if (focusAssetId) {
        const [
          { response: currentResponse, data: currentData },
          { response: listResponse, data: listData },
        ] = await Promise.all([
          apiFetchJson<unknown>(`/v1/assets/${focusAssetId}`),
          apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>(
            '/v1/assets?page=1&page_size=200'
          ),
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
          ? rawAssets
              .map((entry) => toAsset(entry))
              .filter((entry): entry is Asset => Boolean(entry))
          : [];

        const nextAssets = ensureUniqueAssets([currentAsset, ...parsedAssets]);
        setUsingDemoRack(false);
        setAssets(nextAssets);
        const nextState = resolvePrimaryAssets(nextAssets, focusAssetId, previousScene);
        setActiveCategory(nextState.activeCategory);
        setActiveTab(nextState.activeCategory);
        setEquippedBySlot(nextState.equippedBySlot);
        setSelectedAssetId(nextState.selectedAssetId || currentAsset.id);
        return;
      }

      const { response, data } = await apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>(
        '/v1/assets?page=1&page_size=200'
      );
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, copy.loadError));
      }

      const rawAssets = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.assets)
          ? data.assets
          : [];
      const nextAssets = ensureUniqueAssets(
        rawAssets
          .map((entry) => toAsset(entry))
          .filter((entry): entry is Asset => Boolean(entry))
      );

      if (nextAssets.length === 0) {
        activateDemoRack();
        return;
      }

      setUsingDemoRack(false);
      setAssets(nextAssets);
      const nextState = resolvePrimaryAssets(nextAssets, focusAssetId, previousScene);
      setActiveCategory(nextState.activeCategory);
      setActiveTab(nextState.activeCategory);
      setEquippedBySlot(nextState.equippedBySlot);
      setSelectedAssetId(nextState.selectedAssetId);
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
      // Ignore persistence failures.
    }
  }, [bodyProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(avatarStorageKey, avatarId);
    } catch {
      // Ignore persistence failures.
    }
  }, [avatarId]);

  useEffect(() => {
    setSelectedMannequinCardId(defaultMannequinCardByGender[currentGender]);
  }, [currentGender]);

  useEffect(() => {
    setActiveSubcategory(subcategoryMeta[activeTab][0]?.id ?? 'all');
  }, [activeTab, subcategoryMeta]);

  const equippedAssets = useMemo(
    () =>
      Object.fromEntries(
        wearableCategories.map((category) => [
          category,
          assets.find((asset) => asset.id === equippedBySlot[category]) ?? null,
        ])
      ) as Partial<Record<WearableCategory, Asset | null>>,
    [assets, equippedBySlot]
  );

  const selectedAsset = useMemo(
    () =>
      assets.find((asset) => asset.id === selectedAssetId) ??
      equippedAssets[activeCategory] ??
      null,
    [activeCategory, assets, equippedAssets, selectedAssetId]
  );

  const activeCategoryAssets = useMemo(
    () => assets.filter((asset) => asset.category === activeCategory),
    [activeCategory, assets]
  );

  useEffect(() => {
    if (activeCategoryAssets.length === 0) return;
    if (selectedAsset && selectedAsset.category === activeCategory) return;
    setSelectedAssetId(
      equippedBySlot[activeCategory] ?? activeCategoryAssets[0]?.id ?? ''
    );
  }, [activeCategory, activeCategoryAssets, equippedBySlot, selectedAsset]);

  const handleEquipAsset = useCallback((asset: Asset) => {
    if (!isWearableCategory(asset.category)) return;
    setActiveCategory(asset.category);
    setActiveTab(asset.category);
    setSelectedAssetId(asset.id);
    setEquippedBySlot((prev) => ({
      ...prev,
      [asset.category]: asset.id,
    }));
  }, []);

  const applyMannequinCard = useCallback((card: MannequinCard) => {
    setSelectedMannequinCardId(card.id);
    setAvatarId(card.avatarId);
    setBodyProfile({ simple: { ...card.bodySimple }, detailed: {} });
  }, []);

  const handleGenderChange = useCallback((nextGender: BodyGender) => {
    setAvatarId(genderAvatarMap[nextGender]);
    setBodyProfile(buildBodyProfileFromGender(nextGender));
    setSelectedMannequinCardId(defaultMannequinCardByGender[nextGender]);
  }, []);

  const handleBodyFieldChange = useCallback((key: BodyFieldKey, value: number) => {
    setBodyProfile((prev) => ({
      ...prev,
      simple: clampBodySimple({
        ...prev.simple,
        [key]: value,
      }),
    }));
  }, []);

  const handleReset = useCallback(() => {
    const nextAvatarId = focusAssetId ? avatarId : 'muse';
    const nextGender = avatarGenderMap[nextAvatarId] ?? 'female';
    const nextBody = buildBodyProfileFromGender(nextGender);
    const nextScene = resolvePrimaryAssets(
      assets.length > 0 ? assets : demoClosetAssets,
      focusAssetId,
      {}
    );
    setAvatarId(nextAvatarId);
    setBodyProfile(nextBody);
    setPoseId('apose');
    setActiveCategory(nextScene.activeCategory);
    setActiveTab(nextScene.activeCategory);
    setEquippedBySlot(nextScene.equippedBySlot);
    setSelectedAssetId(nextScene.selectedAssetId || focusAssetId || defaultDemoClosetAssetId);
    setSelectedMannequinCardId(defaultMannequinCardByGender[nextGender]);
    setBackgroundColor(DEFAULT_BG);
    setSaveStatus(null);
    setUnit('cm');
  }, [assets, avatarId, focusAssetId]);

  const handleSave = useCallback(() => {
    const payload: StoredSceneState = {
      activeCategory,
      avatarId,
      equippedBySlot,
      poseId,
      selectedAssetId,
    };

    try {
      window.localStorage.setItem(sceneStorageKey, JSON.stringify(payload));
      window.localStorage.setItem(bodyStorageKey, JSON.stringify(bodyProfile));
      window.localStorage.setItem(avatarStorageKey, avatarId);
      setSaveStatus(copy.saved);
      window.setTimeout(() => setSaveStatus(null), 1200);
    } catch {
      setSaveStatus(null);
    }
  }, [activeCategory, avatarId, bodyProfile, copy.saved, equippedBySlot, poseId, selectedAssetId]);

  const handleTabChange = useCallback(
    (nextTab: BrowserTab) => {
      setActiveTab(nextTab);
      if (
        nextTab === 'tops' ||
        nextTab === 'outerwear' ||
        nextTab === 'bottoms' ||
        nextTab === 'shoes'
      ) {
        setActiveCategory(nextTab);
        setSelectedAssetId(
          equippedBySlot[nextTab] ??
            assets.find((asset) => asset.category === nextTab)?.id ??
            ''
        );
      }
    },
    [assets, equippedBySlot]
  );

  const themeStyle = useMemo(() => buildTheme(backgroundColor), [backgroundColor]);

  const poseCards = useMemo<BrowserCard[]>(
    () =>
      posePresets.map((pose) => ({
        id: pose.id,
        kind: 'pose',
        title: pose.label[uiLanguage],
        subtitle:
          uiLanguage === 'ko'
            ? pose.id === 'apose' || pose.id === 'tpose'
              ? copy.basicPose
              : pose.id === 'relaxed' || pose.id === 'walk'
                ? copy.casualPose
                : copy.fittingPose
            : pose.id === 'apose' || pose.id === 'tpose'
              ? copy.basicPose
              : pose.id === 'relaxed' || pose.id === 'walk'
                ? copy.casualPose
                : copy.fittingPose,
        thumbClass: thumbClassForId(pose.id),
        poseId: pose.id,
      })),
    [copy.basicPose, copy.casualPose, copy.fittingPose, uiLanguage]
  );

  const mannequinBrowserCards = useMemo<BrowserCard[]>(
    () =>
      mannequinCards.map((card) => ({
        id: card.id,
        kind: 'mannequin',
        title: card.title,
        subtitle: card.subtitle,
        thumbClass: thumbClassForId(card.id),
        mannequin: card,
      })),
    [mannequinCards]
  );

  const wearableBrowserCards = useMemo(() => {
    const cards = Object.fromEntries(
      wearableCategories.map((category) => [
        category,
        assets
          .filter((asset) => asset.category === category)
          .map<BrowserCard>((asset) => {
            const templateId = resolveGarmentTemplate(asset).id.replace(/-/g, '_');
            return {
              id: asset.id,
              kind: 'asset',
              title: asset.name,
              subtitle: asset.brand ?? getClosetCategoryLabel(category, uiLanguage),
              thumbClass: thumbClassForId(templateId),
              thumbStyle: orbStyleFromImage(asset.imageSrc),
              category,
              asset,
            };
          }),
      ])
    ) as Record<WearableCategory, BrowserCard[]>;

    return cards;
  }, [assets, uiLanguage]);

  const filteredCards = useMemo(() => {
    const filterMannequins = (cards: BrowserCard[]) => {
      if (activeSubcategory === 'female') {
        return cards.filter(
          (card) => card.kind === 'mannequin' && card.mannequin.gender === 'female'
        );
      }
      if (activeSubcategory === 'male') {
        return cards.filter(
          (card) => card.kind === 'mannequin' && card.mannequin.gender === 'male'
        );
      }
      if (activeSubcategory === 'recommended') {
        return cards.filter(
          (card) =>
            card.id === 'female_standard' ||
            card.id === 'female_tall' ||
            card.id === 'male_standard' ||
            card.id === 'male_broad'
        );
      }
      return cards;
    };

    const filterPoses = (cards: BrowserCard[]) => {
      if (activeSubcategory === 'base') {
        return cards.filter(
          (card) =>
            card.kind === 'pose' &&
            (card.poseId === 'apose' || card.poseId === 'tpose')
        );
      }
      if (activeSubcategory === 'casual') {
        return cards.filter(
          (card) =>
            card.kind === 'pose' &&
            (card.poseId === 'relaxed' || card.poseId === 'walk')
        );
      }
      if (activeSubcategory === 'fitting') {
        return cards.filter(
          (card) =>
            card.kind === 'pose' &&
            (card.poseId === 'contrapposto' || card.poseId === 'handsonhips')
        );
      }
      return cards;
    };

    const filterAssets = (cards: BrowserCard[]) => {
      return cards.filter((card) => {
        if (card.kind !== 'asset') return false;
        const templateId = resolveGarmentTemplate(card.asset).id;
        switch (activeTab) {
          case 'tops':
            if (activeSubcategory === 'shirts') return templateId === 'top-shirt';
            if (activeSubcategory === 'tees') return templateId === 'top-tee';
            return true;
          case 'outerwear':
            if (activeSubcategory === 'bombers') return templateId === 'outer-bomber';
            if (activeSubcategory === 'blazers') return templateId === 'outer-blazer';
            if (activeSubcategory === 'coats') return templateId === 'outer-coat';
            return true;
          case 'bottoms':
            if (activeSubcategory === 'shorts') return templateId === 'bottom-shorts';
            if (activeSubcategory === 'pants') return templateId !== 'bottom-shorts';
            return true;
          case 'shoes':
            if (activeSubcategory === 'sneakers') return templateId === 'shoes-sneaker';
            if (activeSubcategory === 'boots') return templateId === 'shoes-boot';
            if (activeSubcategory === 'runners') return templateId === 'shoes-runner';
            return true;
          default:
            return true;
        }
      });
    };

    if (activeTab === 'mannequin') return filterMannequins(mannequinBrowserCards);
    if (activeTab === 'pose') return filterPoses(poseCards);
    return filterAssets(wearableBrowserCards[activeTab]);
  }, [
    activeSubcategory,
    activeTab,
    mannequinBrowserCards,
    poseCards,
    wearableBrowserCards,
  ]);

  const handleCardPick = useCallback(
    (card: BrowserCard) => {
      if (card.kind === 'mannequin') {
        applyMannequinCard(card.mannequin);
        return;
      }

      if (card.kind === 'pose') {
        setPoseId(card.poseId);
        return;
      }

      handleEquipAsset(card.asset);
    },
    [applyMannequinCard, handleEquipAsset]
  );

  const selectedBrowserId =
    activeTab === 'mannequin'
      ? selectedMannequinCardId
      : activeTab === 'pose'
        ? poseId
        : equippedBySlot[activeTab] ?? selectedAssetId;

  const currentSummary = useMemo(() => {
    const selectedMannequin =
      mannequinCards.find((card) => card.id === selectedMannequinCardId) ??
      mannequinCards.find((card) => card.gender === currentGender) ??
      mannequinCards[0];
    const currentPose = posePresets.find((pose) => pose.id === poseId);
    const detail = wearableCategories
      .map((category) => {
        const asset = equippedAssets[category];
        return `${getClosetCategoryLabel(category, uiLanguage)} ${asset?.name ?? '-'}`;
      })
      .join(' · ');

    return {
      title: `${selectedMannequin?.title ?? copy.mannequin} · ${currentPose?.label[uiLanguage] ?? copy.pose}`,
      detail: usingDemoRack ? `${copy.demoRackHint} ${detail}` : detail,
    };
  }, [
    copy.demoRackHint,
    copy.mannequin,
    copy.pose,
    currentGender,
    equippedAssets,
    mannequinCards,
    poseId,
    selectedMannequinCardId,
    uiLanguage,
    usingDemoRack,
  ]);

  return (
    <>
      <div className={styles.appShell} style={themeStyle}>
        <div className={styles.sceneShell}>
          <div className={styles.sceneSurface}>
            <FittingCanvas3D
              body={bodyProfile}
              equippedAssets={equippedAssets}
              selectedAssetId={selectedAsset?.id ?? selectedAssetId}
              avatarId={avatarId}
              poseId={poseId}
            />
          </div>

          <TopControls
            copy={copy}
            onExit={() => router.back()}
            onReset={handleReset}
            onSave={handleSave}
            saveLabel={saveStatus ?? copy.save}
          />

          <LeftPanel
            backgroundColor={backgroundColor}
            copy={copy}
            onBackgroundChange={setBackgroundColor}
            onCustomize={() => setIsCustomizeOpen(true)}
            statusDetail={currentSummary.detail}
            statusTitle={currentSummary.title}
          />

          <AssetPanel
            activeTab={activeTab}
            cards={filteredCards}
            copy={copy}
            onCardPick={handleCardPick}
            onSubcategoryChange={setActiveSubcategory}
            onTabChange={handleTabChange}
            selectedId={selectedBrowserId}
            subcategories={subcategoryMeta[activeTab]}
            subcategoryId={activeSubcategory}
            tabMeta={tabMeta}
            usingDemoRack={usingDemoRack}
          />

          {loading ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.errorCard}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.loading}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className={styles.errorOverlay}>
              <div className={styles.errorCard}>
                <p className="text-sm">{error ?? copy.loadError}</p>
                <button
                  type="button"
                  className={cn(styles.ghostPill, 'mt-4 px-4')}
                  onClick={() => void loadLab()}
                >
                  {copy.retry}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <MeasurementModal
        bodyProfile={bodyProfile}
        copy={copy}
        currentGender={currentGender}
        mannequinCards={mannequinCards}
        onBodyFieldChange={handleBodyFieldChange}
        onClose={() => setIsCustomizeOpen(false)}
        onGenderChange={handleGenderChange}
        onPickMannequin={applyMannequinCard}
        onPoseChange={setPoseId}
        open={isCustomizeOpen}
        poseId={poseId}
        uiLanguage={uiLanguage}
        unit={unit}
        onUnitChange={setUnit}
      />
    </>
  );
}

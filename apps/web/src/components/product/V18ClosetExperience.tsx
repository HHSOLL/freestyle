"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import {
  assessGarmentPhysicalFit,
  defaultEquippedItems,
  formatGarmentFitSummary,
} from "@freestyle/domain-garment";
import type {
  AvatarPoseId,
  BodyProfile,
  GarmentFitAssessment,
  GarmentFitDimensionAssessment,
  GarmentCategory,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import styles from "./v18-closet.module.css";

const CM_PER_INCH = 2.54;
const DEFAULT_BG = "#d8dbdf";

const TAB_META = {
  마네킹: { title: "Mannequin", short: "👤", rail: "Base Bodies" },
  포즈: { title: "Pose", short: "✦", rail: "Pose Presets" },
  헤어: { title: "Hair", short: "✂", rail: "Hair Styles" },
  상의: { title: "Outfits", short: "👕", rail: "Starter Outfits" },
  외투: { title: "Outerwear", short: "🧥", rail: "Outerwear" },
  하의: { title: "Bottoms", short: "👖", rail: "Bottoms" },
  신발: { title: "Shoes", short: "👟", rail: "Shoes" },
  액세서리: { title: "Accessories", short: "🕶️", rail: "Accessories" },
} as const;

const SUBCATEGORY_META = {
  마네킹: ["전체", "여성", "남성", "추천"],
  포즈: ["전체", "기본", "캐주얼", "피팅"],
  헤어: ["전체", "제거", "숏", "보브", "포니", "롱"],
  상의: ["전체", "제거", "탱크", "티셔츠", "니트"],
  외투: ["전체", "제거", "재킷", "블레이저", "코트"],
  하의: ["전체", "제거", "팬츠", "와이드", "쇼츠"],
  신발: ["전체", "제거", "플랫", "스니커즈", "부츠"],
  액세서리: ["전체", "제거", "모자", "아이웨어"],
} as const;

const GENDER_BASE_MEASUREMENTS_CM = {
  male: {
    height: 178,
    headCircumference: 57,
    shoulderWidth: 46,
    waist: 80,
    legLength: 85,
    armLength: 63,
  },
  female: {
    height: 166,
    headCircumference: 55,
    shoulderWidth: 40,
    waist: 70,
    legLength: 79,
    armLength: 58,
  },
} as const;

const MEASUREMENT_PRESETS = {
  male: [
    {
      key: "male_standard",
      label: "남성 기본",
      measurements: { height: 178, headCircumference: 57, shoulderWidth: 46, waist: 80, legLength: 85, armLength: 63 },
    },
    {
      key: "male_slim",
      label: "남성 슬림",
      measurements: { height: 181, headCircumference: 56, shoulderWidth: 43.5, waist: 73, legLength: 88, armLength: 64 },
    },
    {
      key: "male_broad",
      label: "남성 와이드",
      measurements: { height: 180, headCircumference: 58, shoulderWidth: 51, waist: 88, legLength: 85, armLength: 64 },
    },
  ],
  female: [
    {
      key: "female_standard",
      label: "여성 기본",
      measurements: { height: 166, headCircumference: 55, shoulderWidth: 40, waist: 70, legLength: 79, armLength: 58 },
    },
    {
      key: "female_slim",
      label: "여성 슬림",
      measurements: { height: 168, headCircumference: 54, shoulderWidth: 38.5, waist: 66, legLength: 81, armLength: 59 },
    },
    {
      key: "female_tall",
      label: "여성 장신",
      measurements: { height: 173, headCircumference: 56, shoulderWidth: 41.5, waist: 72, legLength: 84, armLength: 60 },
    },
  ],
} as const;

const MANNEQUIN_PRESETS = [
  {
    id: "female_standard",
    category: "마네킹",
    name: "여성 기본",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    measurements: MEASUREMENT_PRESETS.female[0].measurements,
  },
  {
    id: "female_slim",
    category: "마네킹",
    name: "여성 슬림",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    measurements: MEASUREMENT_PRESETS.female[1].measurements,
  },
  {
    id: "female_tall",
    category: "마네킹",
    name: "여성 장신",
    subtitle: "로컬 피팅 바디",
    gender: "female",
    measurements: MEASUREMENT_PRESETS.female[2].measurements,
  },
  {
    id: "male_standard",
    category: "마네킹",
    name: "남성 기본",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    measurements: MEASUREMENT_PRESETS.male[0].measurements,
  },
  {
    id: "male_slim",
    category: "마네킹",
    name: "남성 슬림",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    measurements: MEASUREMENT_PRESETS.male[1].measurements,
  },
  {
    id: "male_broad",
    category: "마네킹",
    name: "남성 와이드",
    subtitle: "로컬 피팅 바디",
    gender: "male",
    measurements: MEASUREMENT_PRESETS.male[2].measurements,
  },
] as const;

const POSE_TEMPLATES = [
  { id: "apose", category: "포즈", name: "A-포즈", subtitle: "기본 의상 확인용" },
  { id: "tpose", category: "포즈", name: "T-포즈", subtitle: "실루엣 점검용" },
  { id: "relaxed", category: "포즈", name: "릴랙스", subtitle: "정면 캐주얼" },
  { id: "contrapposto", category: "포즈", name: "콘트라포스토", subtitle: "체중 이동 포즈" },
  { id: "walk", category: "포즈", name: "워크", subtitle: "보행 시작 포즈" },
  { id: "handsonhips", category: "포즈", name: "핸즈온힙", subtitle: "핏 강조 포즈" },
] as const;

const FIELD_DEFS = [
  { key: "height", label: "키", unit: "cm", unitInch: "in", min: 140, max: 220, step: 0.5 },
  { key: "headCircumference", label: "머리둘레", unit: "cm", unitInch: "in", min: 48, max: 68, step: 0.1 },
  { key: "shoulderWidth", label: "어깨너비", unit: "cm", unitInch: "in", min: 34, max: 64, step: 0.1 },
  { key: "waist", label: "허리둘레", unit: "cm", unitInch: "in", min: 54, max: 130, step: 0.1 },
  { key: "legLength", label: "다리길이", unit: "cm", unitInch: "in", min: 65, max: 110, step: 0.1 },
  { key: "armLength", label: "팔길이", unit: "cm", unitInch: "in", min: 48, max: 84, step: 0.1 },
] as const;

const CATEGORY_BY_TAB = {
  헤어: "hair",
  상의: "tops",
  외투: "outerwear",
  하의: "bottoms",
  신발: "shoes",
  액세서리: "accessories",
} as const satisfies Record<string, GarmentCategory>;

const PRODUCT_POSE_FROM_V18: Record<string, AvatarPoseId> = {
  apose: "neutral",
  tpose: "neutral",
  relaxed: "relaxed",
  contrapposto: "contrapposto",
  walk: "stride",
  handsonhips: "tailored",
};

const V18_POSE_FROM_PRODUCT: Record<AvatarPoseId, string> = {
  neutral: "apose",
  relaxed: "relaxed",
  contrapposto: "contrapposto",
  stride: "walk",
  tailored: "handsonhips",
};

type GenderValue = "female" | "male";
type TabValue = keyof typeof TAB_META;
type MeasurementState = {
  height: number;
  headCircumference: number;
  shoulderWidth: number;
  waist: number;
  legLength: number;
  armLength: number;
};

type DisplayItem = {
  id: string;
  category: string;
  name: string;
  subtitle: string;
  thumbUrl?: string;
  gender?: GenderValue;
  measurements?: MeasurementState;
  filterTags?: string[];
  assessment?: GarmentFitAssessment | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toDisplay(cm: number, unit: "cm" | "inch") {
  return unit === "inch" ? cm / CM_PER_INCH : cm;
}

function fromDisplay(value: number, unit: "cm" | "inch") {
  return unit === "inch" ? value * CM_PER_INCH : value;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 216, g: 219, b: 223 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgba({ r, g, b }: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, ratio: number) {
  return {
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [transform(r), transform(g), transform(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
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
}

function hue2rgb(p: number, q: number, t: number) {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }) {
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
}

function normalizeHex(raw: string) {
  const sanitized = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
  if (sanitized.length !== 6) return null;
  return `#${sanitized.toLowerCase()}`;
}

function buildTheme(hex: string) {
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
    cssVars: {
      "--app-bg-start": rgbToHex(start),
      "--app-bg-end": rgbToHex(end),
      "--text-primary": rgbToHex(textPrimary),
      "--text-secondary": rgbToHex(textSecondary),
      "--text-muted": rgbToHex(textMuted),
      "--button-bg": isLight ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.10)",
      "--button-hover": isLight ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.16)",
      "--button-border": rgba(panelDark, isLight ? 0.14 : 0.26),
      "--input-bg": isLight ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)",
      "--input-border": rgba(panelDark, isLight ? 0.14 : 0.22),
      "--panel-glass-outer": rgba(panelLight, isLight ? 0.18 : 0.1),
      "--panel-glass-inner": rgba(panelLight, isLight ? 0.08 : 0.04),
      "--panel-highlight": rgba(white, isLight ? 0.18 : 0.12),
      "--panel-shadow": isLight ? "rgba(12,18,24,0.16)" : "rgba(0,0,0,0.26)",
      "--panel-divider": rgba(white, isLight ? 0.32 : 0.16),
      "--accent-bg": rgba(accentBg, isLight ? 0.58 : 0.42),
      "--accent-border": rgba(accentStroke, isLight ? 0.62 : 0.56),
      "--accent-text": rgbToHex(accentText),
      "--accent-solid": rgbToHex(accentStroke),
      "--accent-glow": rgba(accent, isLight ? 0.22 : 0.28),
      "--scene-halo": rgba(accent, isLight ? 0.1 : 0.18),
      "--modal-backdrop": isLight ? "rgba(10,14,20,0.24)" : "rgba(0,0,0,0.62)",
      "--thumb-bg": isLight ? "rgba(232, 237, 244, 0.82)" : "rgba(200, 210, 224, 0.14)",
    },
  };
}

function itemThumbClass(itemId: string) {
  return itemId.replace(/[^a-z0-9_]/gi, "_");
}

function toMeasurementState(profile: BodyProfile, gender: GenderValue): MeasurementState {
  const base = GENDER_BASE_MEASUREMENTS_CM[gender];
  return {
    height: profile.simple.heightCm,
    headCircumference: profile.detailed?.headCircumferenceCm ?? base.headCircumference,
    shoulderWidth: profile.simple.shoulderCm,
    waist: profile.simple.waistCm,
    legLength: profile.simple.inseamCm,
    armLength: profile.detailed?.armLengthCm ?? base.armLength,
  };
}

function applyMeasurementsToProfile(profile: BodyProfile, measurements: MeasurementState, gender: GenderValue): BodyProfile {
  return {
    ...profile,
    gender,
    simple: {
      ...profile.simple,
      heightCm: measurements.height,
      shoulderCm: measurements.shoulderWidth,
      waistCm: measurements.waist,
      inseamCm: measurements.legLength,
    },
    detailed: {
      ...(profile.detailed ?? {}),
      headCircumferenceCm: measurements.headCircumference,
      armLengthCm: measurements.armLength,
    },
  };
}

function classifyStarter(item: RuntimeGarmentAsset) {
  const lower = item.name.toLowerCase();
  if (item.category === "tops") {
    if (lower.includes("camisole") || lower.includes("tank")) return ["탱크"];
    if (lower.includes("sweater") || lower.includes("knit")) return ["니트"];
    return ["티셔츠"];
  }
  if (item.category === "outerwear") {
    if (lower.includes("blazer")) return ["블레이저"];
    if (lower.includes("coat")) return ["코트"];
    return ["재킷"];
  }
  if (item.category === "bottoms") {
    if (lower.includes("wool") || lower.includes("wide")) return ["팬츠", "와이드"];
    if (lower.includes("short")) return ["쇼츠"];
    return ["팬츠"];
  }
  if (item.category === "shoes") {
    if (lower.includes("flat")) return ["플랫"];
    if (lower.includes("boot")) return ["부츠"];
    if (lower.includes("runner")) return ["러너"];
    return ["스니커즈"];
  }
  if (item.category === "accessories") {
    if (lower.includes("shade") || lower.includes("sunglass")) return ["아이웨어"];
    if (lower.includes("hat") || lower.includes("cap")) return ["모자"];
    return ["모자"];
  }
  if (item.category === "hair") {
    if (lower.includes("pony")) return ["포니"];
    if (lower.includes("bob")) return ["보브"];
    if (lower.includes("long")) return ["롱"];
    return ["숏"];
  }
  return ["전체"];
}

function filterItemsBySubcategory(items: DisplayItem[], activeTab: TabValue, subCategory: string) {
  if (subCategory === "전체") return items;
  if (activeTab === "마네킹") {
    if (subCategory === "여성") return items.filter((item) => item.gender === "female");
    if (subCategory === "남성") return items.filter((item) => item.gender === "male");
    if (subCategory === "추천") return items.slice(0, 3);
    return items;
  }
  if (activeTab === "포즈") {
    if (subCategory === "기본") return items.filter((item) => ["apose", "tpose"].includes(item.id));
    if (subCategory === "캐주얼") return items.filter((item) => ["relaxed", "walk"].includes(item.id));
    if (subCategory === "피팅") return items.filter((item) => ["contrapposto", "handsonhips"].includes(item.id));
    return items;
  }
  if (subCategory === "제거") return [];
  return items.filter((item) => item.filterTags?.includes(subCategory));
}

function fitStateLabel(state: GarmentFitAssessment["overallState"]) {
  return {
    compression: "끼는 핏",
    snug: "슬림 핏",
    regular: "정사이즈",
    relaxed: "여유 핏",
    oversized: "오버 핏",
  }[state];
}

function fitRiskLabel(risk: NonNullable<GarmentFitAssessment["tensionRisk"]>) {
  return {
    low: "낮음",
    medium: "중간",
    high: "높음",
  }[risk];
}

function fitStateTone(state: GarmentFitAssessment["overallState"]) {
  return {
    compression: "toneCompression",
    snug: "toneSnug",
    regular: "toneRegular",
    relaxed: "toneRelaxed",
    oversized: "toneOversized",
  }[state];
}

function fitRiskTone(risk: NonNullable<GarmentFitAssessment["tensionRisk"]>) {
  return {
    low: "toneRegular",
    medium: "toneSnug",
    high: "toneCompression",
  }[risk];
}

function fitDimensionLabel(key: GarmentFitDimensionAssessment["key"]) {
  return {
    chestCm: "가슴",
    waistCm: "허리",
    hipCm: "힙",
    shoulderCm: "어깨",
    sleeveLengthCm: "소매",
    lengthCm: "총장",
    inseamCm: "인심",
    riseCm: "밑위",
    hemCm: "밑단",
    headCircumferenceCm: "머리",
    frameWidthCm: "프레임폭",
  }[key];
}

function fitDimensionDelta(entry: GarmentFitDimensionAssessment) {
  if (entry.easeCm < 0) {
    return `- ${Math.abs(entry.easeCm).toFixed(1)}cm`;
  }
  if (entry.easeCm > 0) {
    return `+ ${entry.easeCm.toFixed(1)}cm`;
  }
  return "0.0cm";
}

function getFitFocusDimensions(assessment: GarmentFitAssessment | null, limit = 3) {
  if (!assessment) return [];

  const ordered: GarmentFitDimensionAssessment[] = [];
  assessment.limitingKeys.forEach((key) => {
    const match = assessment.dimensions.find((entry) => entry.key === key);
    if (match && !ordered.some((entry) => entry.key === match.key)) {
      ordered.push(match);
    }
  });

  assessment.dimensions.forEach((entry) => {
    if (!ordered.some((match) => match.key === entry.key)) {
      ordered.push(entry);
    }
  });

  return ordered.slice(0, limit);
}

function TopControls({
  onBack,
  onResetAll,
  onSave,
  saveText,
}: {
  onBack: () => void;
  onResetAll: () => void;
  onSave: () => void;
  saveText: string;
}) {
  return (
    <div className={styles["top-controls"]}>
      <button type="button" className={styles["top-button"]} onClick={onBack}>
        나가기
      </button>
      <div className={styles["top-actions"]}>
        <button type="button" className={styles["top-button"]} onClick={onResetAll}>
          리셋
        </button>
        <button type="button" className={`${styles["top-button"]} ${styles.primary}`} onClick={onSave}>
          {saveText}
        </button>
      </div>
    </div>
  );
}

function LeftPanel({
  backgroundColor,
  setBackgroundColor,
  selectedSummary,
  fitDetails,
  onOpenCustomize,
}: {
  backgroundColor: string;
  setBackgroundColor: (value: string) => void;
  selectedSummary: { title: string; detail: string };
  fitDetails: Array<{ label: string; assessment: GarmentFitAssessment | null }>;
  onOpenCustomize: () => void;
}) {
  const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeHex(event.target.value);
    if (normalized) setBackgroundColor(normalized);
  };

  return (
    <section className={`${styles["overlay-panel"]} ${styles["left-panel"]} ${styles["glass-panel"]}`}>
      <div className={`${styles["left-title"]}`}>
        <div className={styles.eyebrow}>CREATE A ZOI</div>
        <h1>스타일 편집</h1>
      </div>

      <div className={`${styles["left-section"]} ${styles["subtle-surface"]}`}>
        <div className={styles["section-title-row"]}>
          <strong>배경 테마</strong>
          <span>대비 자동 적용</span>
        </div>
        <div className={styles["theme-grid"]}>
          <label className={styles["theme-field"]}>
            <span>직접 선택</span>
            <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
          </label>
          <label className={styles["theme-field"]}>
            <span>HEX</span>
            <input value={backgroundColor.toUpperCase()} onChange={handleHexChange} maxLength={7} />
          </label>
        </div>
      </div>

      <button type="button" className={styles["hero-button"]} onClick={onOpenCustomize}>
        마네킹 커스텀
      </button>

      <div className={styles["left-bottom-spacer"]} />

      <div className={`${styles["status-panel"]} ${styles["subtle-surface"]}`}>
        <span className={styles["mini-label"]}>현재 상태</span>
        <strong>{selectedSummary.title}</strong>
        <small>{selectedSummary.detail}</small>
        {fitDetails.length ? (
          <div className={styles["status-fit-list"]}>
            {fitDetails.map((item) => (
              <div key={item.label} className={styles["fit-card"]}>
                <div className={styles["fit-card-head"]}>
                  <strong>{item.label}</strong>
                  {item.assessment?.sizeLabel ? (
                    <span className={styles["fit-size-chip"]}>{item.assessment.sizeLabel}</span>
                  ) : null}
                </div>
                {item.assessment ? (
                  <>
                    <div className={styles["fit-chip-row"]}>
                      <span className={`${styles["fit-chip"]} ${styles[fitStateTone(item.assessment.overallState)]}`}>
                        {fitStateLabel(item.assessment.overallState)}
                      </span>
                      <span className={`${styles["fit-chip"]} ${styles[fitRiskTone(item.assessment.tensionRisk)]}`}>
                        당김 {fitRiskLabel(item.assessment.tensionRisk)}
                      </span>
                      <span className={`${styles["fit-chip"]} ${styles[fitRiskTone(item.assessment.clippingRisk)]}`}>
                        간섭 {fitRiskLabel(item.assessment.clippingRisk)}
                      </span>
                    </div>
                    <div className={styles["fit-dimension-list"]}>
                      {getFitFocusDimensions(item.assessment).map((dimension) => (
                        <div key={dimension.key} className={styles["fit-dimension-row"]}>
                          <span className={styles["fit-dimension-label"]}>{fitDimensionLabel(dimension.key)}</span>
                          <span className={`${styles["fit-chip"]} ${styles[fitStateTone(dimension.state)]}`}>
                            {fitStateLabel(dimension.state)}
                          </span>
                          <span className={styles["fit-dimension-delta"]}>{fitDimensionDelta(dimension)}</span>
                        </div>
                      ))}
                    </div>
                    <small>{formatGarmentFitSummary(item.assessment, "ko")}</small>
                  </>
                ) : (
                  <small>사이즈 데이터 없음</small>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MeasurementModal({
  open,
  onClose,
  unit,
  setUnit,
  gender,
  setGender,
  measurements,
  setMeasurements,
  selectedPoseId,
  setSelectedPoseId,
}: {
  open: boolean;
  onClose: () => void;
  unit: "cm" | "inch";
  setUnit: (value: "cm" | "inch") => void;
  gender: GenderValue;
  setGender: (gender: GenderValue) => void;
  measurements: MeasurementState;
  setMeasurements: (next: MeasurementState) => void;
  selectedPoseId: string;
  setSelectedPoseId: (poseId: string) => void;
}) {
  if (!open) return null;

  const applyPreset = (preset: (typeof MEASUREMENT_PRESETS)[GenderValue][number]) => {
    setMeasurements(preset.measurements);
  };

  return (
    <div className={styles["modal-root"]}>
      <div className={styles["modal-panel"]}>
        <div className={styles["modal-header"]}>
          <div>
            <div className={styles["modal-eyebrow"]}>CUSTOM MANNEQUIN</div>
            <h2>마네킹 커스텀</h2>
          </div>
          <button type="button" className={styles["modal-close"]} onClick={onClose}>
            닫기
          </button>
        </div>

        <div className={`${styles["modal-toolbar"]} ${styles.split}`}>
          <div className={styles["segmented-switch"]}>
            <button type="button" className={gender === "female" ? styles.active : ""} onClick={() => { setGender("female"); setMeasurements(MEASUREMENT_PRESETS.female[0].measurements); }}>
              여성
            </button>
            <button type="button" className={gender === "male" ? styles.active : ""} onClick={() => { setGender("male"); setMeasurements(MEASUREMENT_PRESETS.male[0].measurements); }}>
              남성
            </button>
          </div>
          <div className={styles["unit-switch"]}>
            <button type="button" className={unit === "cm" ? styles.active : ""} onClick={() => setUnit("cm")}>
              CM
            </button>
            <button type="button" className={unit === "inch" ? styles.active : ""} onClick={() => setUnit("inch")}>
              INCH
            </button>
          </div>
        </div>

        <div className={styles["preset-grid"]}>
          {MEASUREMENT_PRESETS[gender].map((preset) => (
            <button key={preset.key} type="button" className={styles["preset-card"]} onClick={() => applyPreset(preset)}>
              <strong>{preset.label}</strong>
              <span>키 {preset.measurements.height} · 어깨 {preset.measurements.shoulderWidth} · 허리 {preset.measurements.waist}</span>
            </button>
          ))}
        </div>

        <div className={styles["modal-toolbar"]}>
          <div className={styles["pose-strip"]}>
            {POSE_TEMPLATES.map((pose) => (
              <button
                key={pose.id}
                type="button"
                className={`${styles["ghost-pill"]} ${selectedPoseId === pose.id ? styles.active : ""}`}
                onClick={() => setSelectedPoseId(pose.id)}
              >
                {pose.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles["modal-field-list"]}>
          {FIELD_DEFS.map((field) => {
            const displayValue = Number(toDisplay(measurements[field.key], unit).toFixed(unit === "cm" ? 1 : 2));
            return (
              <div key={field.key} className={styles["field-card"]}>
                <div className={styles["field-head"]}>
                  <span>{field.label}</span>
                  <span className={styles["field-range"]}>
                    {field.min}–{field.max} {unit === "cm" ? field.unit : field.unitInch}
                  </span>
                </div>
                <div className={styles["field-input-row"]}>
                  <input
                    type="number"
                    min={unit === "cm" ? field.min : field.min / CM_PER_INCH}
                    max={unit === "cm" ? field.max : field.max / CM_PER_INCH}
                    step={field.step}
                    value={displayValue}
                    onChange={(event) => {
                      const raw = Number(event.target.value);
                      if (Number.isNaN(raw)) return;
                      setMeasurements({
                        ...measurements,
                        [field.key]: clamp(fromDisplay(raw, unit), field.min, field.max),
                      });
                    }}
                  />
                  <span className={styles["field-unit"]}>{unit === "cm" ? field.unit : field.unitInch}</span>
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
  setActiveTab,
  mannequinCards,
  poseCards,
  itemSets,
  selection,
  selectedPoseId,
  setSelectedPoseId,
  selectedPreviewMannequinId,
  setSelectedPreviewMannequinId,
  onApplyMannequinPreset,
  onPickCategoryItem,
  onRemoveActiveCategory,
  onPreviewItem,
  onClearPreview,
}: {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  mannequinCards: DisplayItem[];
  poseCards: DisplayItem[];
  itemSets: Record<"hair" | "top" | "outerwear" | "bottom" | "shoes" | "accessory", DisplayItem[]>;
  selection: Record<"hair" | "top" | "outerwear" | "bottom" | "shoes" | "accessory", { id: string | null; name: string }>;
  selectedPoseId: string;
  setSelectedPoseId: (poseId: string) => void;
  selectedPreviewMannequinId: string;
  setSelectedPreviewMannequinId: (mannequinId: string) => void;
  onApplyMannequinPreset: (item: DisplayItem) => void;
  onPickCategoryItem: (tab: TabValue, item: DisplayItem) => void;
  onRemoveActiveCategory: (tab: TabValue) => void;
  onPreviewItem: (itemId: string | null) => void;
  onClearPreview: () => void;
}) {
  const [subCategory, setSubCategory] = useState<string>(() => SUBCATEGORY_META[activeTab]?.[0] || "전체");

  const tabItems = useMemo(() => {
    switch (activeTab) {
      case "마네킹":
        return mannequinCards;
      case "포즈":
        return poseCards;
      case "헤어":
        return itemSets.hair;
      case "상의":
        return itemSets.top;
      case "외투":
        return itemSets.outerwear;
      case "하의":
        return itemSets.bottom;
      case "신발":
        return itemSets.shoes;
      case "액세서리":
        return itemSets.accessory;
      default:
        return itemSets.top;
    }
  }, [activeTab, mannequinCards, poseCards, itemSets]);

  const visibleItems = useMemo(
    () => filterItemsBySubcategory(tabItems, activeTab, subCategory),
    [tabItems, activeTab, subCategory],
  );

  const onPick = (item: DisplayItem) => {
    switch (activeTab) {
      case "마네킹":
        setSelectedPreviewMannequinId(item.id);
        onApplyMannequinPreset(item);
        break;
      case "포즈":
        setSelectedPoseId(item.id);
        break;
      default:
        onPickCategoryItem(activeTab, item);
        break;
    }
  };

  const isSelected = (item: DisplayItem) => {
    if (activeTab === "마네킹") return selectedPreviewMannequinId === item.id;
    if (activeTab === "포즈") return selectedPoseId === item.id;
    if (activeTab === "헤어") return selection.hair.id === item.id;
    if (activeTab === "상의") return selection.top.id === item.id;
    if (activeTab === "외투") return selection.outerwear.id === item.id;
    if (activeTab === "하의") return selection.bottom.id === item.id;
    if (activeTab === "신발") return selection.shoes.id === item.id;
    if (activeTab === "액세서리") return selection.accessory.id === item.id;
    return false;
  };

  return (
    <section className={`${styles["overlay-panel"]} ${styles["right-panel"]} ${styles["glass-panel"]}`}>
      <div className={styles["outfit-topline"]}>Outfit</div>
      <div className={styles["outfit-title"]}>{TAB_META[activeTab].title}</div>

      <div className={styles["reference-browser"]}>
        <div className={styles["vertical-rail"]}>
          {Object.keys(TAB_META).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles["rail-row"]} ${activeTab === tab ? styles["active-rail"] : ""}`}
              onClick={() => setActiveTab(tab as TabValue)}
            >
              <span className={styles["rail-icon"]}>{TAB_META[tab as TabValue].short}</span>
              <span className={styles["rail-label"]}>{tab}</span>
            </button>
          ))}
        </div>

        <div className={styles["subcategory-column"]}>
          <div className={styles["subcategory-title"]}>{TAB_META[activeTab].rail}</div>
          {(SUBCATEGORY_META[activeTab] || ["전체"]).map((label) => (
            <button
              key={label}
              type="button"
              className={`${styles["subcategory-pill"]} ${subCategory === label ? styles["active-subcategory"] : ""}`}
              onClick={() => setSubCategory(label)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles["asset-column"]}>
          <div className={styles["asset-toolbar"]}>
            <button type="button" className={styles["toolbar-text"]} onClick={() => onRemoveActiveCategory(activeTab)}>
              {activeTab === "마네킹" ? "Preset" : activeTab === "포즈" ? "Reset Pose" : "Clear"}
            </button>
            <div className={styles["toolbar-icons"]}>
              <span className={styles["toolbar-dot"]} />
              <span className={styles["toolbar-dot-alt"]} />
              <span className={styles["toolbar-filter"]}>⌕</span>
            </div>
          </div>

          <div className={styles["asset-grid"]}>
            {visibleItems.map((item) => {
              const thumbClass = styles[itemThumbClass(item.id)] ?? "";
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles["asset-tile"]} ${isSelected(item) ? styles.selected : ""}`}
                  onClick={() => onPick(item)}
                  onMouseEnter={() => onPreviewItem(item.id)}
                  onMouseLeave={onClearPreview}
                  onFocus={() => onPreviewItem(item.id)}
                  onBlur={onClearPreview}
                >
                  <div className={styles["asset-orb-wrap"]}>
                    <div
                      className={`${styles["asset-orb"]} ${thumbClass}`}
                      style={item.thumbUrl ? { backgroundImage: `url(${item.thumbUrl})` } : undefined}
                    />
                  </div>
                  <div className={`${styles["asset-copy"]} ${styles["reference-copy"]}`}>
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                    {item.assessment ? (
                      <>
                        <div className={styles["asset-fit-row"]}>
                          {item.assessment.sizeLabel ? (
                            <span className={styles["asset-size-chip"]}>{item.assessment.sizeLabel}</span>
                          ) : null}
                          <span className={`${styles["asset-fit-chip"]} ${styles[fitStateTone(item.assessment.overallState)]}`}>
                            {fitStateLabel(item.assessment.overallState)}
                          </span>
                          <span className={`${styles["asset-fit-chip"]} ${styles[fitRiskTone(item.assessment.tensionRisk)]}`}>
                            당김 {fitRiskLabel(item.assessment.tensionRisk)}
                          </span>
                        </div>
                        <div className={styles["asset-fit-focus-list"]}>
                          {getFitFocusDimensions(item.assessment, 2).map((dimension) => (
                            <span key={dimension.key} className={styles["asset-fit-focus"]}>
                              {fitDimensionLabel(dimension.key)} {fitDimensionDelta(dimension)}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function V18ClosetExperience() {
  const router = useRouter();
  const { profile, avatarVariantId, setProfile } = useBodyProfile();
  const { closetRuntimeAssets } = useWardrobeAssets();
  const { scene, equippedGarments, setPose, equipItem, clearCategory, setSelectedItemId } = useClosetScene(closetRuntimeAssets);

  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [activeTab, setActiveTab] = useState<TabValue>("상의");
  const [saveText, setSaveText] = useState("저장");
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreviewMannequinId, setSelectedPreviewMannequinId] = useState("female_standard");
  const deferredProfile = useDeferredValue(profile);
  const genderState: GenderValue = (profile.gender as GenderValue | undefined) === "male" ? "male" : "female";
  const selectedPoseId = V18_POSE_FROM_PRODUCT[scene.poseId];
  const measurements = useMemo(() => toMeasurementState(profile, genderState), [profile, genderState]);

  const setMeasurements = (next: MeasurementState) => {
    setProfile((current) => applyMeasurementsToProfile(current, next, genderState));
  };

  const applyGenderAndMeasurements = (nextGender: GenderValue, next: MeasurementState) => {
    setProfile((current) => applyMeasurementsToProfile(current, next, nextGender));
  };

  const itemSets = useMemo(() => {
    const toDisplayItem = (item: RuntimeGarmentAsset): DisplayItem => ({
      id: item.id,
      category: item.category,
      name: item.name,
      subtitle: item.publication?.sourceSystem === "admin-domain" ? "관리자 발행 에셋" : item.brand ?? "분리형 GLB",
      thumbUrl: item.imageSrc,
      filterTags: classifyStarter(item),
      assessment: assessGarmentPhysicalFit(item, profile),
    });

    return {
      top: closetRuntimeAssets.filter((item) => item.category === "tops").map(toDisplayItem),
      outerwear: closetRuntimeAssets.filter((item) => item.category === "outerwear").map(toDisplayItem),
      bottom: closetRuntimeAssets.filter((item) => item.category === "bottoms").map(toDisplayItem),
      shoes: closetRuntimeAssets.filter((item) => item.category === "shoes").map(toDisplayItem),
      accessory: closetRuntimeAssets.filter((item) => item.category === "accessories").map(toDisplayItem),
      hair: closetRuntimeAssets.filter((item) => item.category === "hair").map(toDisplayItem),
    };
  }, [closetRuntimeAssets, profile]);

  const selection = useMemo(() => {
    const top = equippedGarments.find((item) => item.category === "tops") ?? null;
    const outerwear = equippedGarments.find((item) => item.category === "outerwear") ?? null;
    const bottom = equippedGarments.find((item) => item.category === "bottoms") ?? null;
    const shoes = equippedGarments.find((item) => item.category === "shoes") ?? null;
    const accessory = equippedGarments.find((item) => item.category === "accessories") ?? null;
    const hair = equippedGarments.find((item) => item.category === "hair") ?? null;

    return {
      hair: { id: hair?.id ?? null, name: hair?.name ?? "기본 헤어" },
      top: { id: top?.id ?? null, name: top?.name ?? "상의 제거" },
      outerwear: { id: outerwear?.id ?? null, name: outerwear?.name ?? "외투 제거" },
      bottom: { id: bottom?.id ?? null, name: bottom?.name ?? "하의 제거" },
      shoes: { id: shoes?.id ?? null, name: shoes?.name ?? "신발 제거" },
      accessory: { id: accessory?.id ?? null, name: accessory?.name ?? "액세서리 제거" },
    };
  }, [equippedGarments]);

  const theme = useMemo(() => buildTheme(backgroundColor), [backgroundColor]);
  const mannequinCards = useMemo<DisplayItem[]>(
    () => MANNEQUIN_PRESETS.map((item) => ({ ...item })),
    [],
  );
  const poseCards = useMemo<DisplayItem[]>(
    () => POSE_TEMPLATES.map((item) => ({ ...item })),
    [],
  );

  const selectedMannequin = useMemo(
    () => MANNEQUIN_PRESETS.find((item) => item.id === selectedPreviewMannequinId) ?? MANNEQUIN_PRESETS[0],
    [selectedPreviewMannequinId],
  );

  const handleApplyMannequinPreset = (item: DisplayItem) => {
    if (!item.measurements || !item.gender) return;
    applyGenderAndMeasurements(item.gender, item.measurements);
  };

  const handleSave = () => {
    setSaveText("저장됨");
    window.setTimeout(() => setSaveText("저장"), 1100);
  };

  const handleResetAll = () => {
    const next = MEASUREMENT_PRESETS.female[0].measurements;
    applyGenderAndMeasurements("female", next);
    clearCategory("tops");
    clearCategory("outerwear");
    clearCategory("bottoms");
    clearCategory("shoes");
    clearCategory("accessories");
    clearCategory("hair");
    if (defaultEquippedItems.shoes) {
      equipItem("shoes", defaultEquippedItems.shoes);
    }
    if (defaultEquippedItems.tops) {
      equipItem("tops", defaultEquippedItems.tops);
    }
    if (defaultEquippedItems.bottoms) {
      equipItem("bottoms", defaultEquippedItems.bottoms);
    }
    setUnit("cm");
    setActiveTab("상의");
    setBackgroundColor(DEFAULT_BG);
    setIsModalOpen(false);
    setSelectedPreviewMannequinId("female_standard");
    setPose("relaxed");
  };

  const selectedSummary = {
    title: selectedMannequin.name,
    detail: `${selection.hair.name} / ${selection.top.name} / ${selection.outerwear.name} / ${selection.bottom.name} / ${selection.shoes.name} / ${selection.accessory.name} · ${POSE_TEMPLATES.find((pose) => pose.id === selectedPoseId)?.name ?? "릴랙스"}`,
  };

  const fitDetails = useMemo(
    () =>
      equippedGarments.map((item) => ({
        label:
          item.category === "hair"
            ? "헤어"
            : item.category === "tops"
              ? "상의"
              : item.category === "outerwear"
                ? "외투"
                : item.category === "bottoms"
                  ? "하의"
                  : item.category === "shoes"
                    ? "신발"
                    : "액세서리",
        assessment: assessGarmentPhysicalFit(item, profile),
      })),
    [equippedGarments, profile],
  );

  const handlePoseChange = (poseId: string) => {
    setPose(PRODUCT_POSE_FROM_V18[poseId] ?? "neutral");
  };

  const handlePickCategoryItem = (tab: TabValue, item: DisplayItem) => {
    if (!(tab in CATEGORY_BY_TAB)) return;
    equipItem(CATEGORY_BY_TAB[tab as keyof typeof CATEGORY_BY_TAB], item.id);
  };

  const handleRemoveActiveCategory = (tab: TabValue) => {
    if (tab === "포즈") {
      handlePoseChange("apose");
      return;
    }
    if (tab === "마네킹") {
      handleApplyMannequinPreset(mannequinCards[0]);
      setSelectedPreviewMannequinId(mannequinCards[0].id);
      return;
    }
    if (tab in CATEGORY_BY_TAB) {
      clearCategory(CATEGORY_BY_TAB[tab as keyof typeof CATEGORY_BY_TAB]);
    }
  };

  const handlePreviewItem = (itemId: string | null) => {
    setSelectedItemId(itemId);
  };

  const handleClearPreview = () => {
    const restoreId =
      activeTab === "상의"
        ? selection.top.id
        : activeTab === "헤어"
          ? selection.hair.id
        : activeTab === "외투"
          ? selection.outerwear.id
          : activeTab === "하의"
            ? selection.bottom.id
            : activeTab === "신발"
              ? selection.shoes.id
              : activeTab === "액세서리"
                ? selection.accessory.id
              : null;
    setSelectedItemId(restoreId);
  };

  return (
    <div className={styles["app-shell"]} style={theme.cssVars as CSSProperties}>
      <div className={styles["scene-shell"]}>
        <div className={styles["scene-surface"]}>
          <AvatarStageViewport
            bodyProfile={deferredProfile}
            avatarVariantId={avatarVariantId}
            poseId={PRODUCT_POSE_FROM_V18[selectedPoseId] ?? scene.poseId}
            equippedGarments={equippedGarments}
            selectedItemId={scene.selectedItemId}
            qualityTier={scene.qualityTier}
          />
        </div>

        <TopControls
          onBack={() => router.back()}
          onResetAll={handleResetAll}
          onSave={handleSave}
          saveText={saveText}
        />

        <LeftPanel
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          selectedSummary={selectedSummary}
          fitDetails={fitDetails}
          onOpenCustomize={() => setIsModalOpen(true)}
        />

        <AssetPanel
          key={activeTab}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mannequinCards={mannequinCards}
          poseCards={poseCards}
          itemSets={itemSets}
          selection={selection}
          selectedPoseId={selectedPoseId}
          setSelectedPoseId={handlePoseChange}
          selectedPreviewMannequinId={selectedPreviewMannequinId}
          setSelectedPreviewMannequinId={setSelectedPreviewMannequinId}
          onApplyMannequinPreset={handleApplyMannequinPreset}
          onPickCategoryItem={handlePickCategoryItem}
          onRemoveActiveCategory={handleRemoveActiveCategory}
          onPreviewItem={handlePreviewItem}
          onClearPreview={handleClearPreview}
        />

        <MeasurementModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          unit={unit}
          setUnit={setUnit}
          gender={genderState}
          setGender={(nextGender) => applyGenderAndMeasurements(nextGender, toMeasurementState(profile, nextGender))}
          measurements={measurements}
          setMeasurements={setMeasurements}
          selectedPoseId={selectedPoseId}
          setSelectedPoseId={handlePoseChange}
        />
      </div>
    </div>
  );
}

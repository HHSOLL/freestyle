"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  assessGarmentPhysicalFit,
  buildGarmentInstantFitReport,
  defaultHairItemIdsByVariant,
  resolveDefaultClosetLoadout,
} from "@freestyle/domain-garment";
import type { GarmentInstantFitReport } from "@freestyle/contracts";
import { preloadViewerAssets } from "@freestyle/viewer-react";
import type {
  AssetCategory,
  BodyFrame,
  BodyProfile,
  GarmentFitAssessment,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { HqFitSimulationPanel } from "@/components/product/closet-fit-simulation";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useFitSimulation } from "@/hooks/useFitSimulation";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import { buildClosetFitCardDisplay } from "./closet-fit-report";
import {
  BODY_FRAME_META,
  CATEGORY_BY_TAB,
  CM_PER_INCH,
  DEFAULT_BG,
  FIELD_DEFS,
  GENDER_BASE_MEASUREMENTS_CM,
  ITEM_SET_KEY_BY_TAB,
  MANNEQUIN_PRESETS,
  MEASUREMENT_PRESETS,
  POSE_TEMPLATES,
  PRODUCT_POSE_FROM_V18,
  SUBCATEGORY_META,
  TAB_META,
  V18_POSE_FROM_PRODUCT,
  type DisplayItem,
  type GenderValue,
  type ItemSetKey,
  type MeasurementState,
  type TabValue,
} from "./v18-closet-config";
import styles from "./v18-closet.module.css";

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
    chest: profile.simple.chestCm,
    waist: profile.simple.waistCm,
    hip: profile.simple.hipCm,
    legLength: profile.simple.inseamCm,
    armLength: profile.detailed?.armLengthCm ?? base.armLength,
    torsoLength: profile.detailed?.torsoLengthCm ?? base.torsoLength,
    thigh: profile.detailed?.thighCm ?? base.thigh,
    calf: profile.detailed?.calfCm ?? base.calf,
  };
}

function applyMeasurementsToProfile(
  profile: BodyProfile,
  measurements: MeasurementState,
  gender: GenderValue,
  bodyFrame: BodyFrame,
): BodyProfile {
  return {
    ...profile,
    gender,
    bodyFrame,
    simple: {
      ...profile.simple,
      heightCm: measurements.height,
      shoulderCm: measurements.shoulderWidth,
      chestCm: measurements.chest,
      waistCm: measurements.waist,
      hipCm: measurements.hip,
      inseamCm: measurements.legLength,
    },
    detailed: {
      ...(profile.detailed ?? {}),
      headCircumferenceCm: measurements.headCircumference,
      armLengthCm: measurements.armLength,
      torsoLengthCm: measurements.torsoLength,
      thighCm: measurements.thigh,
      calfCm: measurements.calf,
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
  hqFitSimulation,
  onOpenCustomize,
}: {
  backgroundColor: string;
  setBackgroundColor: (value: string) => void;
  selectedSummary: { title: string; detail: string };
  fitDetails: Array<{ label: string; report: GarmentInstantFitReport | null }>;
  hqFitSimulation: ReactNode;
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

      {hqFitSimulation}

      <div className={styles["left-bottom-spacer"]} />

      <div className={`${styles["status-panel"]} ${styles["subtle-surface"]}`}>
        <span className={styles["mini-label"]}>현재 상태</span>
        <strong>{selectedSummary.title}</strong>
        <small>{selectedSummary.detail}</small>
        {fitDetails.length ? (
          <div className={styles["status-fit-list"]}>
            {fitDetails.map((item) => (
              <FitCard key={item.label} label={item.label} report={item.report} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FitCard({
  label,
  report,
}: {
  label: string;
  report: GarmentInstantFitReport | null;
}) {
  const display = buildClosetFitCardDisplay(report, 3);

  return (
    <div className={styles["fit-card"]}>
      <div className={styles["fit-card-head"]}>
        <strong>{label}</strong>
        {display?.sizeLabel ? <span className={styles["fit-size-chip"]}>{display.sizeLabel}</span> : null}
      </div>
      {display ? (
        <>
          <div className={styles["fit-chip-row"]}>
            <span className={`${styles["fit-chip"]} ${styles[display.overallTone]}`}>{display.overallLabel}</span>
            <span className={styles["fit-size-chip"]}>{display.confidenceLabel}</span>
            <span className={`${styles["fit-chip"]} ${styles[display.tensionTone]}`}>당김 {display.tensionLabel}</span>
            <span className={`${styles["fit-chip"]} ${styles[display.clippingTone]}`}>간섭 {display.clippingLabel}</span>
          </div>
          <div className={styles["fit-dimension-list"]}>
            {display.focusRegions.map((region) => (
              <div key={`${label}-${region.label}`} className={styles["fit-dimension-row"]}>
                <span className={styles["fit-dimension-label"]}>{region.label}</span>
                <span className={`${styles["fit-chip"]} ${styles[region.fitTone]}`}>{region.fitLabel}</span>
                <span className={styles["fit-dimension-delta"]}>{region.delta}</span>
              </div>
            ))}
          </div>
          <small>{display.summary}</small>
          {display.explanations[0] !== display.summary ? <small>{display.explanations[0]}</small> : null}
        </>
      ) : (
        <small>사이즈 데이터 없음</small>
      )}
    </div>
  );
}

function MeasurementModal({
  open,
  onClose,
  unit,
  setUnit,
  gender,
  setGender,
  bodyFrame,
  setBodyFrame,
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
  bodyFrame: BodyFrame;
  setBodyFrame: (bodyFrame: BodyFrame) => void;
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
            <button
              type="button"
              className={gender === "female" ? styles.active : ""}
              onClick={() => setGender("female")}
            >
              여성
            </button>
            <button
              type="button"
              className={gender === "male" ? styles.active : ""}
              onClick={() => setGender("male")}
            >
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
            <button
              key={preset.key}
              type="button"
              className={styles["preset-card"]}
              onClick={() => {
                setBodyFrame(preset.bodyFrame);
                applyPreset(preset);
              }}
            >
              <strong>{preset.label}</strong>
              <span>키 {preset.measurements.height} · 가슴 {preset.measurements.chest} · 힙 {preset.measurements.hip}</span>
            </button>
          ))}
        </div>

        <div className={styles["modal-toolbar"]}>
          <div className={styles["pose-strip"]}>
            {(Object.keys(BODY_FRAME_META) as BodyFrame[]).map((frame) => (
              <button
                key={frame}
                type="button"
                className={`${styles["ghost-pill"]} ${bodyFrame === frame ? styles.active : ""}`}
                onClick={() => setBodyFrame(frame)}
                title={BODY_FRAME_META[frame].subtitle}
              >
                {BODY_FRAME_META[frame].label}
              </button>
            ))}
          </div>
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
              const fitDisplay = buildClosetFitCardDisplay(item.fitReport ?? null, 2);
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
                    {fitDisplay ? (
                      <>
                        <div className={styles["asset-fit-row"]}>
                          {fitDisplay.sizeLabel ? (
                            <span className={styles["asset-size-chip"]}>{fitDisplay.sizeLabel}</span>
                          ) : null}
                          <span className={`${styles["asset-fit-chip"]} ${styles[fitDisplay.overallTone]}`}>
                            {fitDisplay.overallLabel}
                          </span>
                          <span className={styles["asset-size-chip"]}>{fitDisplay.confidenceLabel}</span>
                        </div>
                        <div className={styles["asset-fit-focus-list"]}>
                          {fitDisplay.focusRegions.map((region) => (
                            <span key={`${item.id}-${region.label}`} className={styles["asset-fit-focus"]}>
                              {region.label} {region.delta}
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
  const { closetRuntimeAssets, publishedAssets, publishedInstantFitReportsById } = useWardrobeAssets();
  const { scene, equippedGarments, setPose, equipItem, clearCategory, setSelectedItemId } = useClosetScene(closetRuntimeAssets);
  const {
    fitSimulation,
    artifactLineage,
    artifactLineageError,
    state: fitSimulationState,
    error: fitSimulationError,
    startFitSimulation,
    refresh: refreshFitSimulation,
    clear: clearFitSimulation,
  } = useFitSimulation();

  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [activeTab, setActiveTab] = useState<TabValue>("상의");
  const [saveText, setSaveText] = useState("저장");
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreviewMannequinId, setSelectedPreviewMannequinId] = useState("female_standard");
  const deferredProfile = useDeferredValue(profile);
  const genderState: GenderValue = (profile.gender as GenderValue | undefined) === "male" ? "male" : "female";
  const bodyFrameState: BodyFrame = profile.bodyFrame ?? "balanced";
  const selectedPoseId = V18_POSE_FROM_PRODUCT[scene.poseId];
  const measurements = useMemo(() => toMeasurementState(profile, genderState), [profile, genderState]);
  const variantDefaults = useMemo(() => resolveDefaultClosetLoadout(avatarVariantId), [avatarVariantId]);
  const runtimeAssetById = useMemo(
    () => new Map(closetRuntimeAssets.map((item) => [item.id, item] as const)),
    [closetRuntimeAssets],
  );
  const defaultHairIds = useMemo(
    () => new Set(Object.values(defaultHairItemIdsByVariant).filter((value): value is string => Boolean(value))),
    [],
  );
  const publishedAssetIds = useMemo(() => new Set(publishedAssets.map((item) => item.id)), [publishedAssets]);
  const [preferredFitSimulationGarmentId, setPreferredFitSimulationGarmentId] = useState<string | null>(null);

  const setMeasurements = (next: MeasurementState) => {
    setProfile((current) => applyMeasurementsToProfile(current, next, genderState, current.bodyFrame ?? bodyFrameState));
  };

  const applyGenderAndMeasurements = (nextGender: GenderValue, next: MeasurementState, nextBodyFrame: BodyFrame) => {
    setProfile((current) => applyMeasurementsToProfile(current, next, nextGender, nextBodyFrame));
  };

  const baseItemSets = useMemo<Record<ItemSetKey, DisplayItem[]>>(() => {
    const toDisplayItem = (item: RuntimeGarmentAsset): DisplayItem => ({
      id: item.id,
      category: item.category,
      name: item.name,
      subtitle: item.publication?.sourceSystem === "admin-domain" ? "관리자 발행 에셋" : item.brand ?? "분리형 GLB",
      thumbUrl: item.imageSrc,
      filterTags: classifyStarter(item),
      fitReport: publishedInstantFitReportsById[item.id] ?? null,
    });

    return {
      top: closetRuntimeAssets.filter((item) => item.category === "tops").map(toDisplayItem),
      outerwear: closetRuntimeAssets.filter((item) => item.category === "outerwear").map(toDisplayItem),
      bottom: closetRuntimeAssets.filter((item) => item.category === "bottoms").map(toDisplayItem),
      shoes: closetRuntimeAssets.filter((item) => item.category === "shoes").map(toDisplayItem),
      accessory: closetRuntimeAssets.filter((item) => item.category === "accessories").map(toDisplayItem),
      hair: closetRuntimeAssets.filter((item) => item.category === "hair").map(toDisplayItem),
    };
  }, [closetRuntimeAssets, publishedInstantFitReportsById]);

  const fitAssessments = useMemo(() => {
    const next = new Map<string, GarmentFitAssessment | null>();
    const activeSetKey =
      activeTab in ITEM_SET_KEY_BY_TAB
        ? ITEM_SET_KEY_BY_TAB[activeTab as keyof typeof ITEM_SET_KEY_BY_TAB]
        : null;

    if (activeSetKey) {
      baseItemSets[activeSetKey].forEach((item) => {
        const runtimeItem = runtimeAssetById.get(item.id);
        if (!runtimeItem) return;
        next.set(item.id, assessGarmentPhysicalFit(runtimeItem, deferredProfile));
      });
    }

    equippedGarments.forEach((item) => {
      if (!next.has(item.id)) {
        next.set(item.id, assessGarmentPhysicalFit(item, deferredProfile));
      }
    });

    return next;
  }, [activeTab, baseItemSets, deferredProfile, equippedGarments, runtimeAssetById]);

  const fitReports = useMemo(() => {
    const next = new Map<string, GarmentInstantFitReport | null>();
    fitAssessments.forEach((assessment, id) => {
      next.set(id, buildGarmentInstantFitReport(assessment ?? null));
    });
    return next;
  }, [fitAssessments]);

  const itemSets = useMemo<Record<ItemSetKey, DisplayItem[]>>(() => {
    const activeSetKey =
      activeTab in ITEM_SET_KEY_BY_TAB
        ? ITEM_SET_KEY_BY_TAB[activeTab as keyof typeof ITEM_SET_KEY_BY_TAB]
        : null;
    if (!activeSetKey) {
      return baseItemSets;
    }

    return {
      ...baseItemSets,
      [activeSetKey]: baseItemSets[activeSetKey].map((item: DisplayItem) => {
        const fitReport = fitReports.get(item.id);
        return fitReport === undefined ? item : { ...item, fitReport };
      }),
    };
  }, [activeTab, baseItemSets, fitReports]);

  const hqSimulationCategories = useMemo<AssetCategory[]>(() => ["tops", "outerwear", "bottoms", "shoes"], []);
  const hqFitCandidates = useMemo(() => {
    const next = new Map<string, RuntimeGarmentAsset>();
    const selectedRuntimeItem = scene.selectedItemId ? runtimeAssetById.get(scene.selectedItemId) ?? null : null;
    if (
      selectedRuntimeItem &&
      publishedAssetIds.has(selectedRuntimeItem.id) &&
      hqSimulationCategories.includes(selectedRuntimeItem.category)
    ) {
      next.set(selectedRuntimeItem.id, selectedRuntimeItem);
    }
    equippedGarments.forEach((item) => {
      if (publishedAssetIds.has(item.id) && hqSimulationCategories.includes(item.category)) {
        next.set(item.id, item);
      }
    });
    return Array.from(next.values());
  }, [equippedGarments, hqSimulationCategories, publishedAssetIds, runtimeAssetById, scene.selectedItemId]);

  const selectedFitSimulationGarmentId = useMemo(() => {
    if (preferredFitSimulationGarmentId && hqFitCandidates.some((item) => item.id === preferredFitSimulationGarmentId)) {
      return preferredFitSimulationGarmentId;
    }
    return hqFitCandidates[0]?.id ?? null;
  }, [hqFitCandidates, preferredFitSimulationGarmentId]);

  useEffect(() => {
    if (!fitSimulation) return;
    if (hqFitCandidates.length === 0) {
      clearFitSimulation();
      return;
    }
    if (selectedFitSimulationGarmentId && fitSimulation.garmentVariantId !== selectedFitSimulationGarmentId) {
      clearFitSimulation();
    }
  }, [clearFitSimulation, fitSimulation, hqFitCandidates.length, selectedFitSimulationGarmentId]);

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

  const preloadCandidates = useMemo(() => {
    const next = new Map<string, RuntimeGarmentAsset>();
    equippedGarments.forEach((item) => next.set(item.id, item));
    if (activeTab in CATEGORY_BY_TAB) {
      const category = CATEGORY_BY_TAB[activeTab as keyof typeof CATEGORY_BY_TAB];
      const preloadLimit =
        category === "hair" || category === "outerwear"
          ? 3
          : category === "accessories"
            ? 4
            : 6;
      closetRuntimeAssets
        .filter((item) => item.category === category)
        .slice(0, preloadLimit)
        .forEach((item) => next.set(item.id, item));
    }
    return Array.from(next.values());
  }, [activeTab, closetRuntimeAssets, equippedGarments]);

  useEffect(() => {
    void preloadViewerAssets({
      avatarVariantIds: [avatarVariantId],
      garmentAssets: preloadCandidates,
      garmentVariantId: avatarVariantId,
      qualityTier: scene.qualityTier,
    });
  }, [avatarVariantId, preloadCandidates, scene.qualityTier]);

  useEffect(() => {
    if (variantDefaults.hair && (!selection.hair.id || defaultHairIds.has(selection.hair.id)) && selection.hair.id !== variantDefaults.hair) {
      equipItem("hair", variantDefaults.hair);
    }
    if (variantDefaults.tops && !selection.top.id) {
      equipItem("tops", variantDefaults.tops);
    }
    if (variantDefaults.bottoms && !selection.bottom.id) {
      equipItem("bottoms", variantDefaults.bottoms);
    }
    if (variantDefaults.shoes && !selection.shoes.id) {
      equipItem("shoes", variantDefaults.shoes);
    }
    if (variantDefaults.accessories && !selection.accessory.id) {
      equipItem("accessories", variantDefaults.accessories);
    }
  }, [
    defaultHairIds,
    equipItem,
    selection.accessory.id,
    selection.bottom.id,
    selection.hair.id,
    selection.shoes.id,
    selection.top.id,
    variantDefaults,
  ]);

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
    applyGenderAndMeasurements(item.gender, item.measurements, item.bodyFrame ?? "balanced");
    const nextVariantId = item.gender === "male" ? "male-base" : "female-base";
    const nextLoadout = resolveDefaultClosetLoadout(nextVariantId);
    setSelectedPreviewMannequinId(item.gender === "male" ? "male_standard" : "female_standard");
    if (nextLoadout.hair) {
      equipItem("hair", nextLoadout.hair);
    } else {
      clearCategory("hair");
    }
    if (nextLoadout.accessories) {
      equipItem("accessories", nextLoadout.accessories);
    } else {
      clearCategory("accessories");
    }
  };

  const handleSave = () => {
    setSaveText("저장됨");
    window.setTimeout(() => setSaveText("저장"), 1100);
  };

  const handleResetAll = () => {
    const next = MEASUREMENT_PRESETS.female[0].measurements;
    const defaultLoadout = resolveDefaultClosetLoadout("female-base");
    applyGenderAndMeasurements("female", next, MEASUREMENT_PRESETS.female[0].bodyFrame);
    clearCategory("tops");
    clearCategory("outerwear");
    clearCategory("bottoms");
    clearCategory("shoes");
    clearCategory("accessories");
    clearCategory("hair");
    if (defaultLoadout.hair) {
      equipItem("hair", defaultLoadout.hair);
    }
    if (defaultLoadout.accessories) {
      equipItem("accessories", defaultLoadout.accessories);
    }
    if (defaultLoadout.shoes) {
      equipItem("shoes", defaultLoadout.shoes);
    }
    if (defaultLoadout.tops) {
      equipItem("tops", defaultLoadout.tops);
    }
    if (defaultLoadout.bottoms) {
      equipItem("bottoms", defaultLoadout.bottoms);
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
    detail: `${BODY_FRAME_META[bodyFrameState].label} / ${selection.hair.name} / ${selection.top.name} / ${selection.outerwear.name} / ${selection.bottom.name} / ${selection.shoes.name} / ${selection.accessory.name} · ${POSE_TEMPLATES.find((pose) => pose.id === selectedPoseId)?.name ?? "뉴트럴"}`,
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
        report: fitReports.get(item.id) ?? null,
      })),
    [equippedGarments, fitReports],
  );

  const fitSimulationQualityTier = useMemo(
    () => (scene.qualityTier === "low" ? "fast" : scene.qualityTier),
    [scene.qualityTier],
  );

  const handleRunFitSimulation = async () => {
    if (!selectedFitSimulationGarmentId) return;
    await startFitSimulation({
      garmentId: selectedFitSimulationGarmentId,
      qualityTier: fitSimulationQualityTier,
    });
  };

  const hqFitSimulationNode = (
    <HqFitSimulationPanel
      availableGarments={hqFitCandidates.map((item) => ({ id: item.id, name: item.name }))}
      selectedGarmentId={selectedFitSimulationGarmentId}
      onSelectGarment={setPreferredFitSimulationGarmentId}
      onRun={handleRunFitSimulation}
      onRefresh={() => {
        refreshFitSimulation().catch(() => undefined);
      }}
      onClear={clearFitSimulation}
      state={fitSimulationState}
      error={fitSimulationError}
      fitSimulation={fitSimulation}
      artifactLineage={artifactLineage}
      artifactLineageError={artifactLineageError}
    />
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
      handlePoseChange("relaxed");
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
    <div className={styles["app-shell"]} style={theme.cssVars as CSSProperties} data-closet-visual-root>
      <div className={styles["scene-shell"]}>
        <div className={styles["scene-surface"]}>
          <AvatarStageViewport
            bodyProfile={deferredProfile}
            avatarVariantId={avatarVariantId}
            poseId={PRODUCT_POSE_FROM_V18[selectedPoseId] ?? scene.poseId}
            equippedGarments={equippedGarments}
            selectedItemId={scene.selectedItemId}
            qualityTier={scene.qualityTier}
            backgroundColor={backgroundColor}
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
          hqFitSimulation={hqFitSimulationNode}
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
          setGender={(nextGender) => {
            const preset = MEASUREMENT_PRESETS[nextGender][0];
            setSelectedPreviewMannequinId(nextGender === "male" ? "male_standard" : "female_standard");
            applyGenderAndMeasurements(nextGender, preset.measurements, preset.bodyFrame);
            const nextHair = defaultHairItemIdsByVariant[nextGender === "male" ? "male-base" : "female-base"];
            if (nextHair) {
              equipItem("hair", nextHair);
            } else {
              clearCategory("hair");
            }
          }}
          bodyFrame={bodyFrameState}
          setBodyFrame={(nextBodyFrame) =>
            setProfile((current) => ({
              ...current,
              bodyFrame: nextBodyFrame,
            }))
          }
          measurements={measurements}
          setMeasurements={setMeasurements}
          selectedPoseId={selectedPoseId}
          setSelectedPoseId={handlePoseChange}
        />
      </div>
    </div>
  );
}

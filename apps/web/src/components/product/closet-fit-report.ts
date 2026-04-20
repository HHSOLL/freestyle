import type { GarmentInstantFitReport } from "@freestyle/contracts";

const overallFitLabels: Record<GarmentInstantFitReport["overallFit"], string> = {
  good: "잘 맞음",
  tight: "타이트",
  loose: "루즈",
  risky: "주의 필요",
};

const overallFitTones: Record<
  GarmentInstantFitReport["overallFit"],
  "toneRegular" | "toneSnug" | "toneRelaxed" | "toneCompression"
> = {
  good: "toneRegular",
  tight: "toneSnug",
  loose: "toneRelaxed",
  risky: "toneCompression",
};

const fitStateLabels: Record<GarmentInstantFitReport["overallState"], string> = {
  compression: "끼는 핏",
  snug: "슬림 핏",
  regular: "정사이즈",
  relaxed: "여유 핏",
  oversized: "오버 핏",
};

const fitStateTones: Record<
  GarmentInstantFitReport["overallState"],
  "toneCompression" | "toneSnug" | "toneRegular" | "toneRelaxed" | "toneOversized"
> = {
  compression: "toneCompression",
  snug: "toneSnug",
  regular: "toneRegular",
  relaxed: "toneRelaxed",
  oversized: "toneOversized",
};

const fitRiskLabels: Record<GarmentInstantFitReport["tensionRisk"], string> = {
  low: "낮음",
  medium: "중간",
  high: "높음",
};

const fitRiskTones: Record<
  GarmentInstantFitReport["tensionRisk"],
  "toneRegular" | "toneSnug" | "toneCompression"
> = {
  low: "toneRegular",
  medium: "toneSnug",
  high: "toneCompression",
};

const regionLabels: Record<GarmentInstantFitReport["primaryRegionId"], string> = {
  chest: "가슴",
  waist: "허리",
  hip: "힙",
  shoulder: "어깨",
  sleeve: "소매",
  length: "총장",
  inseam: "인심",
  rise: "밑위",
  hem: "밑단",
  head: "머리",
  frame: "프레임",
};

const formatEaseDelta = (easeCm: number) => {
  if (easeCm < 0) {
    return `- ${Math.abs(easeCm).toFixed(1)}cm`;
  }
  if (easeCm > 0) {
    return `+ ${easeCm.toFixed(1)}cm`;
  }
  return "0.0cm";
};

const regionSortScore = (
  report: GarmentInstantFitReport,
  region: GarmentInstantFitReport["regions"][number],
) => {
  if (region.regionId === report.primaryRegionId) return 0;
  if (region.isLimiting) return 1;
  return 2;
};

export type ClosetFitCardDisplay = {
  sizeLabel: string | null;
  overallLabel: string;
  overallTone: "toneRegular" | "toneSnug" | "toneRelaxed" | "toneCompression";
  summary: string;
  explanations: string[];
  confidenceLabel: string;
  tensionLabel: string;
  tensionTone: "toneRegular" | "toneSnug" | "toneCompression";
  clippingLabel: string;
  clippingTone: "toneRegular" | "toneSnug" | "toneCompression";
  focusRegions: Array<{
    label: string;
    fitLabel: string;
    fitTone: "toneCompression" | "toneSnug" | "toneRegular" | "toneRelaxed" | "toneOversized";
    delta: string;
    isLimiting: boolean;
  }>;
};

export const buildClosetFitCardDisplay = (
  report: GarmentInstantFitReport | null,
  limit = 3,
): ClosetFitCardDisplay | null => {
  if (!report) {
    return null;
  }

  const orderedRegions = [...report.regions]
    .sort((left, right) => regionSortScore(report, left) - regionSortScore(report, right))
    .slice(0, limit);

  return {
    sizeLabel: report.sizeLabel,
    overallLabel: overallFitLabels[report.overallFit],
    overallTone: overallFitTones[report.overallFit],
    summary: report.summary.ko,
    explanations: report.explanations.map((entry) => entry.ko),
    confidenceLabel: `신뢰도 ${Math.round(report.confidence * 100)}%`,
    tensionLabel: fitRiskLabels[report.tensionRisk],
    tensionTone: fitRiskTones[report.tensionRisk],
    clippingLabel: fitRiskLabels[report.clippingRisk],
    clippingTone: fitRiskTones[report.clippingRisk],
    focusRegions: orderedRegions.map((region) => ({
      label: regionLabels[region.regionId],
      fitLabel: fitStateLabels[region.fitState],
      fitTone: fitStateTones[region.fitState],
      delta: formatEaseDelta(region.easeCm),
      isLimiting: region.isLimiting,
    })),
  };
};

import type { FitSimulationArtifactLineage, FitSimulationRecord } from "@freestyle/contracts";
import type { FitSimulationClientState } from "@/hooks/useFitSimulation";

const simulationStatusLabels: Record<FitSimulationClientState, string> = {
  idle: "대기",
  creating: "생성 중",
  queued: "대기열",
  processing: "계산 중",
  succeeded: "완료",
  failed: "실패",
  "auth-required": "로그인 필요",
  unavailable: "사용 불가",
  error: "오류",
};

const simulationStatusTones: Record<
  FitSimulationClientState,
  "toneRegular" | "toneSnug" | "toneRelaxed" | "toneCompression"
> = {
  idle: "toneRelaxed",
  creating: "toneSnug",
  queued: "toneRelaxed",
  processing: "toneSnug",
  succeeded: "toneRegular",
  failed: "toneCompression",
  "auth-required": "toneCompression",
  unavailable: "toneCompression",
  error: "toneCompression",
};

const overlayLabels: Record<NonNullable<FitSimulationRecord["fitMapSummary"]>["dominantOverlayKind"], string> = {
  easeMap: "여유",
  stretchMap: "신장",
  collisionRiskMap: "간섭",
  confidenceMap: "신뢰도",
};

const regionLabels: Record<NonNullable<FitSimulationRecord["fitMapSummary"]>["dominantRegionId"], string> = {
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

const qualityLabels: Record<FitSimulationRecord["qualityTier"], string> = {
  fast: "빠른",
  balanced: "밸런스",
  high: "고품질",
};

const drapeSourceLabels: Record<FitSimulationArtifactLineage["drapeSource"], string> = {
  "authored-scene-merge": "authored merge",
  "solver-output": "solver output",
};

const storageBackendLabels: Record<FitSimulationArtifactLineage["storageBackend"], string> = {
  "local-file": "local file",
  "remote-storage": "remote storage",
};

export type ClosetFitSimulationDisplay = {
  statusLabel: string;
  statusTone: "toneRegular" | "toneSnug" | "toneRelaxed" | "toneCompression";
  qualityLabel: string | null;
  dominantOverlayLabel: string | null;
  dominantRegionLabel: string | null;
  dominantScoreLabel: string | null;
  durationLabel: string | null;
  stretchLabel: string | null;
  previewImageUrl: string | null;
  drapedGlbUrl: string | null;
  fitMapUrl: string | null;
  metricsUrl: string | null;
  artifactLineageUrl: string | null;
  drapeSourceLabel: string | null;
  storageBackendLabel: string | null;
  warning: string | null;
  summary: string | null;
};

export const buildClosetFitSimulationDisplay = (
  record: FitSimulationRecord | null,
  state: FitSimulationClientState,
  artifactLineage: FitSimulationArtifactLineage | null = null,
): ClosetFitSimulationDisplay => {
  const previewImageUrl = record?.artifacts.find((artifact) => artifact.kind === "preview_png")?.url ?? null;
  const drapedGlbUrl = record?.artifacts.find((artifact) => artifact.kind === "draped_glb")?.url ?? null;
  const fitMapUrl = record?.artifacts.find((artifact) => artifact.kind === "fit_map_json")?.url ?? null;
  const metricsUrl = record?.artifacts.find((artifact) => artifact.kind === "metrics_json")?.url ?? null;
  const artifactLineageUrl = artifactLineage?.manifestUrl ?? null;
  const summary = record?.instantFit?.summary.ko ?? record?.errorMessage ?? null;
  const firstWarning = record?.warnings[0] ?? null;
  const dominantOverlay = record?.fitMapSummary ? overlayLabels[record.fitMapSummary.dominantOverlayKind] : null;
  const dominantRegion = record?.fitMapSummary ? regionLabels[record.fitMapSummary.dominantRegionId] : null;
  const dominantScoreLabel = record?.fitMapSummary
    ? `${Math.round(record.fitMapSummary.dominantScore * 100)}%`
    : null;
  const durationLabel = record?.metrics ? `${(record.metrics.durationMs / 1000).toFixed(1)}s` : null;
  const stretchLabel = record?.metrics ? `${record.metrics.maxStretchRatio.toFixed(2)}x stretch` : null;
  const drapeSourceLabel = artifactLineage ? drapeSourceLabels[artifactLineage.drapeSource] : null;
  const storageBackendLabel = artifactLineage ? storageBackendLabels[artifactLineage.storageBackend] : null;

  return {
    statusLabel: simulationStatusLabels[state],
    statusTone: simulationStatusTones[state],
    qualityLabel: record ? qualityLabels[record.qualityTier] : null,
    dominantOverlayLabel: dominantOverlay,
    dominantRegionLabel: dominantRegion,
    dominantScoreLabel,
    durationLabel,
    stretchLabel,
    previewImageUrl,
    drapedGlbUrl,
    fitMapUrl,
    metricsUrl,
    artifactLineageUrl,
    drapeSourceLabel,
    storageBackendLabel,
    warning: firstWarning,
    summary,
  };
};

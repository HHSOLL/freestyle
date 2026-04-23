"use client";
/* eslint-disable @next/next/no-img-element */

import type { FitSimulationArtifactLineage, FitSimulationRecord } from "@freestyle/contracts";
import type { FitSimulationClientState } from "@/hooks/useFitSimulation";
import { buildClosetFitSimulationDisplay } from "./closet-fit-simulation-display";
import styles from "./v18-closet.module.css";

type HqFitSimulationPanelProps = {
  availableGarments: Array<{ id: string; name: string }>;
  selectedGarmentId: string | null;
  onSelectGarment: (id: string) => void;
  onRun: () => void;
  onRefresh: () => void;
  onClear: () => void;
  state: FitSimulationClientState;
  error: string | null;
  fitSimulation: FitSimulationRecord | null;
  artifactLineage: FitSimulationArtifactLineage | null;
  artifactLineageError: string | null;
};

export function HqFitSimulationPanel({
  availableGarments,
  selectedGarmentId,
  onSelectGarment,
  onRun,
  onRefresh,
  onClear,
  state,
  error,
  fitSimulation,
  artifactLineage,
  artifactLineageError,
}: HqFitSimulationPanelProps) {
  const display = buildClosetFitSimulationDisplay(fitSimulation, state, artifactLineage);
  const canRun = Boolean(selectedGarmentId) && !["creating", "processing", "queued"].includes(state);
  const selectedGarmentName =
    availableGarments.find((garment) => garment.id === selectedGarmentId)?.name ?? "선택된 의상 없음";

  return (
    <div className={`${styles["hq-fit-panel"]} ${styles["subtle-surface"]}`}>
      <div className={styles["section-title-row"]}>
        <strong>HQ 핏 시뮬레이션</strong>
        <span>{selectedGarmentName}</span>
      </div>

      {availableGarments.length ? (
        <div className={styles["hq-fit-garment-list"]}>
          {availableGarments.map((garment) => (
            <button
              key={garment.id}
              type="button"
              className={`${styles["hq-fit-garment-chip"]} ${
                garment.id === selectedGarmentId ? styles["active-hq-fit-garment-chip"] : ""
              }`}
              onClick={() => onSelectGarment(garment.id)}
            >
              {garment.name}
            </button>
          ))}
        </div>
      ) : (
        <small className={styles["hq-fit-note"]}>현재 장착된 발행 의상이 없어 HQ 피팅을 시작할 수 없습니다.</small>
      )}

      <div className={styles["hq-fit-action-row"]}>
        <button type="button" className={styles["hq-fit-action"]} onClick={onRun} disabled={!canRun}>
          {state === "succeeded" ? "다시 계산" : "HQ 계산"}
        </button>
        <button type="button" className={styles["hq-fit-action"]} onClick={onRefresh} disabled={!fitSimulation}>
          새로고침
        </button>
        <button type="button" className={styles["hq-fit-action"]} onClick={onClear} disabled={!fitSimulation && !error}>
          지우기
        </button>
      </div>

      <div className={styles["fit-chip-row"]}>
        <span className={`${styles["fit-chip"]} ${styles[display.statusTone]}`}>{display.statusLabel}</span>
        {display.qualityLabel ? <span className={styles["fit-size-chip"]}>{display.qualityLabel}</span> : null}
        {display.durationLabel ? <span className={styles["fit-size-chip"]}>{display.durationLabel}</span> : null}
      </div>

      {display.previewImageUrl ? (
        <div className={styles["hq-fit-preview-shell"]}>
          <img src={display.previewImageUrl} alt="HQ fit preview" className={styles["hq-fit-preview-image"]} />
        </div>
      ) : null}

      {display.summary ? <small className={styles["hq-fit-note"]}>{display.summary}</small> : null}

      {display.dominantOverlayLabel && display.dominantRegionLabel ? (
        <div className={styles["hq-fit-metric-list"]}>
          <div className={styles["hq-fit-metric-row"]}>
            <span>우세 오버레이</span>
            <strong>{display.dominantOverlayLabel}</strong>
          </div>
          <div className={styles["hq-fit-metric-row"]}>
            <span>주요 부위</span>
            <strong>{display.dominantRegionLabel}</strong>
          </div>
          {display.dominantScoreLabel ? (
            <div className={styles["hq-fit-metric-row"]}>
              <span>강도</span>
              <strong>{display.dominantScoreLabel}</strong>
            </div>
          ) : null}
          {display.stretchLabel ? (
            <div className={styles["hq-fit-metric-row"]}>
              <span>최대 신장</span>
              <strong>{display.stretchLabel}</strong>
            </div>
          ) : null}
          {display.drapeSourceLabel ? (
            <div className={styles["hq-fit-metric-row"]}>
              <span>Drape source</span>
              <strong>{display.drapeSourceLabel}</strong>
            </div>
          ) : null}
          {display.storageBackendLabel ? (
            <div className={styles["hq-fit-metric-row"]}>
              <span>Storage</span>
              <strong>{display.storageBackendLabel}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {display.warning ? <small className={styles["hq-fit-note"]}>{display.warning}</small> : null}
      {artifactLineageError ? <small className={styles["hq-fit-note"]}>{artifactLineageError}</small> : null}
      {error ? <small className={styles["hq-fit-error"]}>{error}</small> : null}

      {display.drapedGlbUrl || display.fitMapUrl || display.metricsUrl || display.artifactLineageUrl ? (
        <div className={styles["hq-fit-link-row"]}>
          {display.drapedGlbUrl ? (
            <a href={display.drapedGlbUrl} target="_blank" rel="noreferrer" className={styles["hq-fit-link"]}>
              draped_glb
            </a>
          ) : null}
          {display.fitMapUrl ? (
            <a href={display.fitMapUrl} target="_blank" rel="noreferrer" className={styles["hq-fit-link"]}>
              fit_map_json
            </a>
          ) : null}
          {display.metricsUrl ? (
            <a href={display.metricsUrl} target="_blank" rel="noreferrer" className={styles["hq-fit-link"]}>
              metrics_json
            </a>
          ) : null}
          {display.artifactLineageUrl ? (
            <a href={display.artifactLineageUrl} target="_blank" rel="noreferrer" className={styles["hq-fit-link"]}>
              artifact_lineage
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

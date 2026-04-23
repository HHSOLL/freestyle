"use client";

import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import type { FitSimulationAdminInspectionResponse } from "@freestyle/contracts";
import { wardrobeTokens } from "@freestyle/design-tokens";

const formatLabel = (value: string) =>
  value.replaceAll("_", " ");

export function FitSimulationInspectionPanel(props: {
  inspection: FitSimulationAdminInspectionResponse | null;
  summary: {
    artifactCount: number;
    warningCount: number;
    artifactKinds: string[];
    hasLineage: boolean;
  };
  isLoading: boolean;
  loadError: string | null;
}) {
  const { inspection, summary } = props;

  return (
    <>
      {props.loadError ? (
        <div
          className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
          style={{ borderColor: "rgba(141,74,69,0.24)", color: wardrobeTokens.color.danger }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{props.loadError}</span>
        </div>
      ) : null}

      {!inspection && !props.isLoading ? (
        <div
          className="rounded-[18px] border px-4 py-4 text-[13px]"
          style={{ borderColor: wardrobeTokens.color.divider, color: wardrobeTokens.color.textMuted }}
        >
          HQ fit simulation id를 입력하면 현재 persisted artifact bundle과 lineage snapshot을 read-only로 확인할 수 있다.
        </div>
      ) : null}

      {inspection ? (
        <div className="space-y-3 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
              <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Fit simulation</div>
              <div className="mt-2">Status: {inspection.fitSimulation.status}</div>
              <div>Avatar: {inspection.fitSimulation.avatarVariantId}</div>
              <div>Garment: {inspection.fitSimulation.garmentVariantId}</div>
              <div>Quality tier: {inspection.fitSimulation.qualityTier}</div>
              <div>Material preset: {inspection.fitSimulation.materialPreset}</div>
            </div>
            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
              <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Artifact summary</div>
              <div className="mt-2">Artifacts: {summary.artifactCount}</div>
              <div>Warnings: {summary.warningCount}</div>
              <div>Lineage: {summary.hasLineage ? "available" : "missing"}</div>
              <div>Artifact kinds: {summary.artifactKinds.join(", ") || "none"}</div>
            </div>
          </div>

          <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
            <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Artifact links</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {inspection.fitSimulation.artifacts.map((artifact) => (
                <a
                  key={`${artifact.kind}:${artifact.url ?? artifact.key ?? "artifact"}`}
                  href={artifact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-[16px] border px-3 py-3 text-[12px]"
                  style={{ borderColor: wardrobeTokens.color.divider, color: wardrobeTokens.color.text }}
                >
                  <span>{formatLabel(artifact.kind)}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
            <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Lineage</div>
            {inspection.artifactLineage ? (
              <div className="mt-2 space-y-1">
                <div>ID: {inspection.artifactLineage.artifactLineageId}</div>
                <div>Drape source: {inspection.artifactLineage.drapeSource}</div>
                <div>Storage backend: {inspection.artifactLineage.storageBackend}</div>
                <div>Generated: {inspection.artifactLineage.generatedAt}</div>
                <a
                  href={inspection.artifactLineage.manifestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold"
                  style={{ color: wardrobeTokens.color.text }}
                >
                  <span>artifact_lineage</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="mt-2">Persisted artifact lineage snapshot이 아직 없다.</div>
            )}
          </div>

          {inspection.fitSimulation.warnings.length > 0 || (inspection.artifactLineage?.warnings.length ?? 0) > 0 ? (
            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
              <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Warnings</div>
              <div className="mt-2 space-y-1">
                {inspection.fitSimulation.warnings.map((warning) => (
                  <div key={`fit:${warning}`}>{warning}</div>
                ))}
                {(inspection.artifactLineage?.warnings ?? []).map((warning) => (
                  <div key={`lineage:${warning}`}>{warning}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.isLoading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>HQ artifact inspection을 불러오는 중...</span>
        </div>
      ) : null}
    </>
  );
}

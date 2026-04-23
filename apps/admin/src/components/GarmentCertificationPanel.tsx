"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type { GarmentCertificationReportItem } from "@freestyle/contracts";
import { wardrobeTokens } from "@freestyle/design-tokens";

const formatMillimeters = (valueInMeters: number | null | undefined) =>
  typeof valueInMeters === "number" ? `${(valueInMeters * 1000).toFixed(1)}mm` : "n/a";

export function GarmentCertificationPanel(props: {
  hasWorkingItem: boolean;
  generatedAtLabel: string;
  loadError: string | null;
  detailError: string | null;
  isLoading: boolean;
  certification: GarmentCertificationReportItem | null;
  summary: {
    variantCount: number;
    penetratingVariantCount: number;
    hotspotZones: string[];
  };
}) {
  const { certification, summary } = props;

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

      {props.hasWorkingItem && !certification && !props.isLoading ? (
        <div
          className="rounded-[18px] border px-4 py-4 text-[13px]"
          style={{ borderColor: wardrobeTokens.color.divider, color: wardrobeTokens.color.textMuted }}
        >
          이 garment는 현재 starter certification bundle에 포함되어 있지 않다. published garment manifest는 그대로 유지되고, 이 화면은 read-only inspection만 제공한다.
        </div>
      ) : null}

      {certification ? (
        <div className="space-y-3 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
              <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Bundle metadata</div>
              <div className="mt-2">Generated: {props.generatedAtLabel}</div>
              <div>Fit policy: {certification.fitPolicyCategory}</div>
              <div>Selected size: {certification.selectedSizeLabel ?? "none"}</div>
              <div>Size labels: {certification.sizeChartLabels.join(", ") || "none"}</div>
            </div>
            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
              <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Coverage summary</div>
              <div className="mt-2">Variants: {summary.variantCount}</div>
              <div>Penetrating variants: {summary.penetratingVariantCount}</div>
              <div>Hotspots: {summary.hotspotZones.join(", ") || "none"}</div>
            </div>
          </div>

          <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
            <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Authoring bundle</div>
            <div className="mt-2 font-mono text-[12px]">{certification.authoring.patternSpecPath}</div>
            <div className="mt-1 font-mono text-[12px]">{certification.authoring.materialProfilePath}</div>
            <div className="mt-1 font-mono text-[12px]">{certification.authoring.simProxyPath}</div>
            <div className="mt-1 font-mono text-[12px]">{certification.authoring.collisionProxyPath}</div>
            <div className="mt-1 font-mono text-[12px]">{certification.authoring.hqArtifactPath}</div>
          </div>

          <div className="grid gap-3">
            {certification.authoring.summaries.map((variantSummary) => (
              <div
                key={variantSummary.variantId}
                className="rounded-[18px] border px-4 py-4"
                style={{ borderColor: wardrobeTokens.color.divider, background: "rgba(255,255,255,0.6)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: wardrobeTokens.color.text }}>
                      {variantSummary.variantId}
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
                      min distance {formatMillimeters(variantSummary.fitAudit.minDistanceMeters)}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{
                      background:
                        variantSummary.fitAudit.penetratingVertexCount === 0
                          ? "rgba(79,123,98,0.16)"
                          : "rgba(141,74,69,0.16)",
                      color:
                        variantSummary.fitAudit.penetratingVertexCount === 0
                          ? wardrobeTokens.color.success
                          : wardrobeTokens.color.danger,
                    }}
                  >
                    penetrating {variantSummary.fitAudit.penetratingVertexCount}
                  </span>
                </div>
                <div className="mt-3 text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
                  hotspots:{" "}
                  {variantSummary.fitAudit.hotSpots
                    .map((hotSpot) => `${hotSpot.zone} (${hotSpot.countWithin5mm})`)
                    .join(", ") || "none"}
                </div>
                <div className="mt-2 font-mono text-[11px]" style={{ color: wardrobeTokens.color.textFaint }}>
                  {variantSummary.summaryPath}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[18px] border px-3 py-3 font-mono text-[12px]" style={{ borderColor: wardrobeTokens.color.divider }}>
            evidence: {certification.evidence.budgetReportPath}
          </div>
        </div>
      ) : null}

      {props.isLoading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Starter certification detail을 불러오는 중...</span>
        </div>
      ) : null}

      {props.detailError ? (
        <div
          className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
          style={{ borderColor: "rgba(141,74,69,0.24)", color: wardrobeTokens.color.danger }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{props.detailError}</span>
        </div>
      ) : null}
    </>
  );
}

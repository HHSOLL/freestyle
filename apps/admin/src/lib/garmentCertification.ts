import type { GarmentCertificationReportItem } from "@freestyle/contracts";

export type GarmentCertificationCoverageFilter = "all" | "covered" | "missing";

export const findGarmentCertification = (
  items: readonly GarmentCertificationReportItem[],
  garmentId: string | null | undefined,
) => {
  if (!garmentId) {
    return null;
  }

  return items.find((item) => item.id === garmentId) ?? null;
};

export const buildGarmentCertificationCoverageSet = (
  items: readonly GarmentCertificationReportItem[],
) => new Set(items.map((item) => item.id));

export const filterByGarmentCertificationCoverage = <T extends { id: string }>(
  items: readonly T[],
  certificationIds: ReadonlySet<string>,
  filter: GarmentCertificationCoverageFilter,
) => {
  if (filter === "all") {
    return [...items];
  }

  return items.filter((item) =>
    filter === "covered" ? certificationIds.has(item.id) : !certificationIds.has(item.id),
  );
};

export const summarizeGarmentCertificationCoverage = <T extends { id: string }>(
  items: readonly T[],
  certificationIds: ReadonlySet<string>,
) => {
  const coveredCount = items.filter((item) => certificationIds.has(item.id)).length;

  return {
    coveredCount,
    uncoveredCount: items.length - coveredCount,
  };
};

export const summarizeGarmentCertification = (item: GarmentCertificationReportItem | null) => {
  if (!item) {
    return {
      variantCount: 0,
      penetratingVariantCount: 0,
      hotspotZones: [] as string[],
    };
  }

  const hotspotZones = Array.from(
    new Set(
      item.authoring.summaries.flatMap((summary) =>
        summary.fitAudit.hotSpots.map((hotSpot) => hotSpot.zone),
      ),
    ),
  );

  return {
    variantCount: item.authoring.summaries.length,
    penetratingVariantCount: item.authoring.summaries.filter(
      (summary) => summary.fitAudit.penetratingVertexCount > 0,
    ).length,
    hotspotZones,
  };
};

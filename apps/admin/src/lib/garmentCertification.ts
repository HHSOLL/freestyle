import type { GarmentCertificationReportItem } from "@freestyle/contracts";

export const findGarmentCertification = (
  items: readonly GarmentCertificationReportItem[],
  garmentId: string | null | undefined,
) => {
  if (!garmentId) {
    return null;
  }

  return items.find((item) => item.id === garmentId) ?? null;
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

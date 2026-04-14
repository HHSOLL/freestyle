import { fitReviewArchetypes } from "@freestyle/domain-avatar";
import { assessGarmentPhysicalFit, formatGarmentFitSummary } from "@freestyle/domain-garment";
import type { BodyProfile, GarmentFitAssessment, GarmentFitState, PublishedGarmentAsset } from "@freestyle/shared-types";

export type AdminFitReviewEntry = {
  id: string;
  label: { ko: string; en: string };
  profile: BodyProfile;
  assessment: GarmentFitAssessment | null;
  summaryKo: string;
};

export const fitStateTone: Record<GarmentFitState, { bg: string; fg: string }> = {
  compression: { bg: "rgba(210,103,89,0.16)", fg: "#8b3e34" },
  snug: { bg: "rgba(214,169,84,0.18)", fg: "#8d6721" },
  regular: { bg: "rgba(91,118,146,0.12)", fg: "#506272" },
  relaxed: { bg: "rgba(109,145,193,0.16)", fg: "#486a92" },
  oversized: { bg: "rgba(151,132,202,0.16)", fg: "#65539a" },
};

export const buildAdminFitReview = (
  item: Pick<PublishedGarmentAsset, "category" | "metadata">,
): AdminFitReviewEntry[] =>
  fitReviewArchetypes.map((entry) => {
    const assessment = assessGarmentPhysicalFit(item, entry.profile);
    return {
      id: entry.id,
      label: entry.label,
      profile: entry.profile,
      assessment,
      summaryKo: formatGarmentFitSummary(assessment, "ko"),
    };
  });

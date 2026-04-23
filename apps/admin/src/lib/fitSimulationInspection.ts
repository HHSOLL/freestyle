import type {
  FitSimulationAdminInspectionResponse,
  FitSimulationAdminInspectionSummary,
} from "@freestyle/contracts";

export type FitSimulationInspectionCoverageFilter = "all" | "with-lineage" | "missing-lineage";

export const summarizeFitSimulationInspection = (
  inspection: FitSimulationAdminInspectionResponse | null,
) => {
  if (!inspection) {
    return {
      artifactCount: 0,
      warningCount: 0,
      artifactKinds: [] as string[],
      hasLineage: false,
    };
  }

  return {
    artifactCount: inspection.fitSimulation.artifacts.length,
    warningCount:
      inspection.fitSimulation.warnings.length + (inspection.artifactLineage?.warnings.length ?? 0),
    artifactKinds: inspection.fitSimulation.artifacts.map((artifact) => artifact.kind),
    hasLineage: Boolean(inspection.artifactLineage),
  };
};

export const findFitSimulationInspectionSummary = (
  items: readonly FitSimulationAdminInspectionSummary[],
  id: string | null | undefined,
) => {
  if (!id) {
    return null;
  }

  return items.find((item) => item.id === id) ?? null;
};

export const summarizeFitSimulationInspectionCatalog = (
  items: readonly FitSimulationAdminInspectionSummary[],
) => ({
  totalCount: items.length,
  withLineageCount: items.filter((item) => item.hasLineage).length,
  terminalCount: items.filter((item) => item.status === "succeeded" || item.status === "failed").length,
});

import type { FitSimulationAdminInspectionResponse } from "@freestyle/contracts";

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

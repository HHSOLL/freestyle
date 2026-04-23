import assert from "node:assert/strict";
import test from "node:test";
import type { FitSimulationAdminInspectionResponse } from "@freestyle/contracts";
import { summarizeFitSimulationInspection } from "./fitSimulationInspection.js";

test("summarizeFitSimulationInspection reports artifact and lineage coverage", () => {
  const inspection: FitSimulationAdminInspectionResponse = {
    schemaVersion: "fit-simulation-admin-inspection.v1",
    fitSimulation: {
      id: "00000000-0000-4000-8000-000000000801",
      jobId: "00000000-0000-4000-8000-000000000901",
      status: "succeeded",
      avatarVariantId: "female-base",
      bodyVersionId: "body-profile:user:revision",
      bodyProfileRevision: "br_test123",
      garmentVariantId: "published-top-admin-fit-sim",
      garmentRevision: "gr_test123",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/partner/admin-fit-sim-tee.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
      cacheKey: "fit-sim:test-cache",
      instantFit: null,
      fitMap: null,
      fitMapSummary: null,
      artifacts: [
        { kind: "draped_glb", url: "https://freestyle.local/fit/draped.glb" },
        { kind: "preview_png", url: "https://freestyle.local/fit/preview.png" },
      ],
      metrics: null,
      warnings: ["preview fallback"],
      errorMessage: null,
      avatarPublication: null,
      createdAt: "2026-04-24T09:00:00.000Z",
      updatedAt: "2026-04-24T09:02:00.000Z",
      completedAt: "2026-04-24T09:02:00.000Z",
    },
    artifactLineage: {
      schemaVersion: "fit-simulation-artifact-lineage.v1",
      artifactLineageId: "fit-lineage:test-lineage",
      generatedAt: "2026-04-24T09:02:00.000Z",
      cacheKey: "fit-sim:test-cache",
      cacheKeyParts: {
        avatarVariantId: "female-base",
        bodyProfileRevision: "br_test123",
        garmentVariantId: "published-top-admin-fit-sim",
        garmentRevision: "gr_test123",
        materialPreset: "knit_medium",
        qualityTier: "balanced",
      },
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/partner/admin-fit-sim-tee.glb",
      storageBackend: "remote-storage",
      drapeSource: "authored-scene-merge",
      artifactKinds: ["draped_glb", "preview_png"],
      manifestKey: "fit-simulations/test/artifact-lineage.json",
      manifestUrl: "https://freestyle.local/fit-simulations/test/artifact-lineage.json",
      warnings: ["lineage note"],
    },
  };

  assert.deepEqual(summarizeFitSimulationInspection(inspection), {
    artifactCount: 2,
    warningCount: 2,
    artifactKinds: ["draped_glb", "preview_png"],
    hasLineage: true,
  });
});

test("summarizeFitSimulationInspection handles empty state", () => {
  assert.deepEqual(summarizeFitSimulationInspection(null), {
    artifactCount: 0,
    warningCount: 0,
    artifactKinds: [],
    hasLineage: false,
  });
});

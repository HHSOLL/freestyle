import assert from "node:assert/strict";
import test from "node:test";
import { buildClosetFitSimulationDisplay } from "./closet-fit-simulation-display.js";

test("buildClosetFitSimulationDisplay summarizes succeeded HQ fit simulations", () => {
  const display = buildClosetFitSimulationDisplay(
    {
      id: "00000000-0000-4000-8000-000000000111",
      jobId: "00000000-0000-4000-8000-000000000211",
      status: "succeeded",
      avatarVariantId: "female-base",
      bodyVersionId: "body-profile:user-id:rev-1",
      bodyProfileRevision: "rev-1",
      garmentVariantId: "published-top-soft",
      garmentRevision: "garment-rev-1",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/top-soft.glb",
      materialPreset: "knit_medium",
      qualityTier: "high",
      cacheKey: "fit-sim:key",
      instantFit: {
        schemaVersion: "garment-instant-fit-report.v1",
        sizeLabel: "M",
        overallFit: "good",
        overallState: "regular",
        tensionRisk: "low",
        clippingRisk: "low",
        confidence: 0.93,
        primaryRegionId: "chest",
        summary: { ko: "M · 안정적인 핏", en: "M · Stable fit" },
        explanations: [{ ko: "가슴 여유가 충분하다.", en: "Chest ease is sufficient." }],
        limitingKeys: ["chestCm"],
        regions: [{ regionId: "chest", measurementKey: "chestCm", fitState: "regular", easeCm: 24, isLimiting: true }],
      },
      fitMap: null,
      fitMapSummary: {
        dominantOverlayKind: "stretchMap",
        dominantRegionId: "chest",
        dominantMeasurementKey: "chestCm",
        dominantScore: 0.68,
        overlayScores: [
          { kind: "stretchMap", overallScore: 0.68, maxRegionScore: 0.68 },
          { kind: "easeMap", overallScore: 0.22, maxRegionScore: 0.4 },
          { kind: "collisionRiskMap", overallScore: 0.18, maxRegionScore: 0.2 },
          { kind: "confidenceMap", overallScore: 0.74, maxRegionScore: 0.74 },
        ],
      },
      artifacts: [
        { kind: "draped_glb", url: "https://freestyle.local/fit-sim/draped.glb" },
        { kind: "preview_png", url: "https://freestyle.local/fit-sim/preview.png" },
        { kind: "fit_map_json", url: "https://freestyle.local/fit-sim/fit-map.json" },
        { kind: "metrics_json", url: "https://freestyle.local/fit-sim/metrics.json" },
      ],
      metrics: {
        durationMs: 4120,
        penetrationRate: 0.02,
        maxStretchRatio: 1.08,
      },
      warnings: ["Phase 4 baseline draped_glb is an authored-scene merge artifact; solver-deformed cloth remains future work."],
      errorMessage: null,
      createdAt: "2026-04-22T09:00:00.000Z",
      updatedAt: "2026-04-22T09:00:05.000Z",
      completedAt: "2026-04-22T09:00:05.000Z",
    },
    "succeeded",
    {
      schemaVersion: "fit-simulation-artifact-lineage.v1",
      artifactLineageId: "fit-lineage:display-smoke",
      generatedAt: "2026-04-22T09:00:05.000Z",
      cacheKey: "fit-sim:key",
      cacheKeyParts: {
        avatarVariantId: "female-base",
        bodyProfileRevision: "rev-1",
        garmentVariantId: "published-top-soft",
        garmentRevision: "garment-rev-1",
        materialPreset: "knit_medium",
        qualityTier: "high",
      },
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/top-soft.glb",
      storageBackend: "remote-storage",
      drapeSource: "authored-scene-merge",
      artifactKinds: ["draped_glb", "preview_png", "fit_map_json", "metrics_json"],
      manifestKey: "fit-simulations/display-smoke/artifact-lineage.json",
      manifestUrl: "https://freestyle.local/fit-sim/artifact-lineage.json",
      warnings: [],
    },
  );

  assert.equal(display.statusLabel, "완료");
  assert.equal(display.qualityLabel, "고품질");
  assert.equal(display.dominantOverlayLabel, "신장");
  assert.equal(display.dominantRegionLabel, "가슴");
  assert.equal(display.durationLabel, "4.1s");
  assert.equal(display.stretchLabel, "1.08x stretch");
  assert.equal(display.previewImageUrl, "https://freestyle.local/fit-sim/preview.png");
  assert.equal(display.drapedGlbUrl, "https://freestyle.local/fit-sim/draped.glb");
  assert.equal(display.fitMapUrl, "https://freestyle.local/fit-sim/fit-map.json");
  assert.equal(display.metricsUrl, "https://freestyle.local/fit-sim/metrics.json");
  assert.equal(display.artifactLineageUrl, "https://freestyle.local/fit-sim/artifact-lineage.json");
  assert.equal(display.drapeSourceLabel, "authored merge");
  assert.equal(display.storageBackendLabel, "remote storage");
});

test("buildClosetFitSimulationDisplay keeps auth-required state without record", () => {
  const display = buildClosetFitSimulationDisplay(null, "auth-required");
  assert.equal(display.statusLabel, "로그인 필요");
  assert.equal(display.statusTone, "toneCompression");
  assert.equal(display.previewImageUrl, null);
  assert.equal(display.artifactLineageUrl, null);
});

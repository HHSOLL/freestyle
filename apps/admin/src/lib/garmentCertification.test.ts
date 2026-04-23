import assert from "node:assert/strict";
import test from "node:test";
import type { GarmentCertificationReportItem } from "@freestyle/contracts";
import {
  buildGarmentCertificationCoverageSet,
  filterByGarmentCertificationCoverage,
  findGarmentCertification,
  summarizeGarmentCertification,
  summarizeGarmentCertificationCoverage,
} from "./garmentCertification.js";

const certificationFixture: GarmentCertificationReportItem = {
  id: "starter-top-soft-casual",
  category: "tops",
  fitPolicyCategory: "tight_top",
  selectedSizeLabel: "L",
  sizeChartLabels: ["M", "L", "XL"],
  runtimePaths: {
    modelPath: "/assets/garments/mpfb/female/top_soft_casual_v4.glb",
  },
  authoring: {
    patternSpecPath: "authoring/garments/mpfb/specs/top_soft_casual.pattern-spec.json",
    materialProfilePath: "authoring/garments/mpfb/specs/top_soft_casual.material-profile.json",
    simProxyPath: "authoring/garments/mpfb/specs/top_soft_casual.sim-proxy.json",
    collisionProxyPath: "authoring/garments/mpfb/specs/top_soft_casual.collision-proxy.json",
    hqArtifactPath: "authoring/garments/mpfb/specs/top_soft_casual.hq-artifact.json",
    summaries: [
      {
        variantId: "female-base",
        summaryPath: "authoring/garments/exports/raw/mpfb-female-top_soft_casual.summary.json",
        outputBlend: "authoring/garments/exports/raw/mpfb-female-top_soft_casual.blend",
        outputGlb: "apps/web/public/assets/garments/mpfb/female/top_soft_casual_v4.glb",
        fitAudit: {
          minDistanceMeters: 0.0017,
          penetratingVertexCount: 0,
          thresholdCounts: {
            "0.001": 0,
            "0.003": 10,
            "0.005": 20,
            "0.01": 30,
          },
          hotSpots: [{ zone: "waist", countWithin5mm: 10 }],
        },
      },
      {
        variantId: "male-base",
        summaryPath: "authoring/garments/exports/raw/mpfb-male-top_soft_casual.summary.json",
        outputBlend: "authoring/garments/exports/raw/mpfb-male-top_soft_casual.blend",
        outputGlb: "apps/web/public/assets/garments/mpfb/male/top_soft_casual_v4.glb",
        fitAudit: {
          minDistanceMeters: 0.0018,
          penetratingVertexCount: 3,
          thresholdCounts: {
            "0.001": 0,
            "0.003": 8,
            "0.005": 12,
            "0.01": 18,
          },
          hotSpots: [
            { zone: "waist", countWithin5mm: 8 },
            { zone: "chest", countWithin5mm: 4 },
          ],
        },
      },
    ],
  },
  evidence: {
    budgetReportPath: "output/asset-budget-report/latest.json",
  },
};

test("findGarmentCertification returns the matching starter certification item", () => {
  assert.equal(findGarmentCertification([certificationFixture], "starter-top-soft-casual")?.id, certificationFixture.id);
  assert.equal(findGarmentCertification([certificationFixture], "missing-id"), null);
});

test("summarizeGarmentCertification keeps variant coverage and hotspot aggregation explicit", () => {
  const summary = summarizeGarmentCertification(certificationFixture);

  assert.equal(summary.variantCount, 2);
  assert.equal(summary.penetratingVariantCount, 1);
  assert.deepEqual(summary.hotspotZones, ["waist", "chest"]);
});

test("coverage helpers keep covered and uncovered garment triage explicit", () => {
  const certificationIds = buildGarmentCertificationCoverageSet([certificationFixture]);
  const garments = [
    { id: "starter-top-soft-casual" },
    { id: "starter-bottom-denim" },
    { id: "starter-shoe-sandal" },
  ];

  assert.deepEqual(
    filterByGarmentCertificationCoverage(garments, certificationIds, "covered").map((item) => item.id),
    ["starter-top-soft-casual"],
  );
  assert.deepEqual(
    filterByGarmentCertificationCoverage(garments, certificationIds, "missing").map((item) => item.id),
    ["starter-bottom-denim", "starter-shoe-sandal"],
  );
  assert.deepEqual(summarizeGarmentCertificationCoverage(garments, certificationIds), {
    coveredCount: 1,
    uncoveredCount: 2,
  });
});

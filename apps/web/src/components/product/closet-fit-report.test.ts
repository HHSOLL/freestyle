import test from "node:test";
import assert from "node:assert/strict";
import { garmentInstantFitReportSchema } from "@freestyle/contracts";
import { buildClosetFitCardDisplay } from "./closet-fit-report.js";

test("buildClosetFitCardDisplay prioritizes primary and limiting regions", () => {
  const report = garmentInstantFitReportSchema.parse({
    schemaVersion: "garment-instant-fit-report.v1",
    sizeLabel: "L",
    overallFit: "tight",
    overallState: "snug",
    tensionRisk: "medium",
    clippingRisk: "low",
    confidence: 0.82,
    primaryRegionId: "waist",
    summary: {
      ko: "L · 허리 기준 타이트",
      en: "L · waist reads tight",
    },
    explanations: [
      { ko: "허리 기준 여유가 작다.", en: "Waist ease is limited." },
      { ko: "장력 위험은 중간 수준이다.", en: "Tension risk is medium." },
    ],
    limitingKeys: ["waistCm", "hipCm"],
    regions: [
      {
        regionId: "hip",
        measurementKey: "hipCm",
        fitState: "snug",
        easeCm: -0.8,
        isLimiting: true,
      },
      {
        regionId: "waist",
        measurementKey: "waistCm",
        fitState: "compression",
        easeCm: -1.4,
        isLimiting: true,
      },
      {
        regionId: "length",
        measurementKey: "lengthCm",
        fitState: "relaxed",
        easeCm: 2.6,
        isLimiting: false,
      },
    ],
  });

  const display = buildClosetFitCardDisplay(report, 2);

  assert.ok(display);
  assert.equal(display.overallLabel, "타이트");
  assert.equal(display.overallTone, "toneSnug");
  assert.equal(display.confidenceLabel, "신뢰도 82%");
  assert.deepEqual(
    display.focusRegions.map((entry) => `${entry.label}:${entry.delta}`),
    ["허리:- 1.4cm", "힙:- 0.8cm"],
  );
  assert.equal(display.explanations[0], "허리 기준 여유가 작다.");
});

test("buildClosetFitCardDisplay returns null when no instant-fit report exists", () => {
  assert.equal(buildClosetFitCardDisplay(null), null);
});

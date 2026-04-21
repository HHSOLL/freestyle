import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fitMapArtifactDataSchema,
  garmentFitAssessmentSchema,
  garmentInstantFitReportSchema,
  garmentPatternSpecSchema,
} from "@freestyle/contracts";
import {
  assessGarmentPhysicalFit,
  assessGarmentInstantFit,
  buildFitMapSummary,
  buildGarmentInstantFitReport,
  computeGarmentCorrectiveTransform,
  defaultHairItemIdsByVariant,
  deriveAdaptiveBodyMaskZonesFromAssessment,
  mergeRuntimeGarmentCatalogs,
  formatGarmentFitSummary,
  defaultSkeletonProfileId,
  getGarmentAdaptiveBodyMaskZones,
  getGarmentEffectiveBodyMaskZones,
  getGarmentPoseRuntimeTuning,
  isTopCompatibleWithOuterwear,
  resolveLayeredEquippedItemIds,
  resolveDefaultClosetLoadout,
  starterGarmentCatalog,
  validateGarmentPatternSpecAgainstStarterCatalog,
  validateGarmentRuntimeBinding,
  validateStarterGarment,
} from "./index.js";
import { defaultBodyProfile } from "@freestyle/shared-types";

const repoRoot = process.cwd();

test("starter garment catalog satisfies runtime contract", () => {
  const issues = starterGarmentCatalog.flatMap(validateStarterGarment);
  assert.deepEqual(issues, []);
});

test("starter garment catalog carries publication-ready physical fit metadata", () => {
  for (const item of starterGarmentCatalog) {
    assert.ok(item.metadata?.measurementModes, `${item.id} is missing measurementModes`);
    assert.ok(item.metadata?.sizeChart?.length, `${item.id} is missing sizeChart`);
    assert.ok(item.metadata?.selectedSizeLabel, `${item.id} is missing selectedSizeLabel`);
    assert.ok(item.metadata?.physicalProfile, `${item.id} is missing physicalProfile`);
    assert.ok(assessGarmentPhysicalFit(item, defaultBodyProfile), `${item.id} does not produce a fit assessment`);
  }
});

test("committed garment pattern specs stay aligned with starter runtime metadata", () => {
  const specRoot = path.join(repoRoot, "authoring/garments/mpfb/specs");
  const specFiles = fs
    .readdirSync(specRoot)
    .filter((entry) => entry.endsWith(".pattern-spec.json"))
    .sort();

  assert.ok(specFiles.length > 0);

  for (const specFile of specFiles) {
    const parsedSpec = garmentPatternSpecSchema.parse(
      JSON.parse(fs.readFileSync(path.join(specRoot, specFile), "utf8")),
    );
    assert.deepEqual(
      validateGarmentPatternSpecAgainstStarterCatalog(parsedSpec),
      [],
      `${specFile} drifted away from starter runtime metadata`,
    );
  }
});

test("pattern spec parity validation flags starter metadata drift", () => {
  const specPath = path.join(repoRoot, "authoring/garments/mpfb/specs/top_soft_casual.pattern-spec.json");
  const parsedSpec = garmentPatternSpecSchema.parse(JSON.parse(fs.readFileSync(specPath, "utf8")));

  assert.deepEqual(
    validateGarmentPatternSpecAgainstStarterCatalog({
      ...parsedSpec,
      anchorIds: ["leftShoulder"],
    }),
    ["pattern spec anchorIds does not match starter runtime metadata."],
  );
});

test("hero garment size charts stay monotonic across M/L/XL ladders", () => {
  const heroIds = [
    "starter-bottom-soft-wool",
    "starter-top-city-relaxed",
    "starter-outer-tailored-layer",
  ];

  for (const id of heroIds) {
    const item = starterGarmentCatalog.find((entry) => entry.id === id);
    assert.ok(item);
    const sizeChart = item.metadata?.sizeChart ?? [];
    const m = sizeChart.find((entry) => entry.label === "M");
    const l = sizeChart.find((entry) => entry.label === "L");
    const xl = sizeChart.find((entry) => entry.label === "XL");
    assert.ok(m && l && xl, `${id} must expose M/L/XL rows`);

    for (const [key, lValue] of Object.entries(l.measurements)) {
      const measurementKey = key as keyof typeof l.measurements;
      const mValue = m.measurements[measurementKey];
      const xlValue = xl.measurements[measurementKey];
      if (typeof mValue !== "number" || typeof lValue !== "number" || typeof xlValue !== "number") {
        continue;
      }
      assert.ok(mValue <= lValue, `${id} ${key} regressed: M > L`);
      assert.ok(lValue <= xlValue, `${id} ${key} regressed: L > XL`);
    }
  }
});

test("starter garment catalog includes accessory samples with head-aware fit assessment", () => {
  const accessoryIds = starterGarmentCatalog
    .filter((item) => item.category === "accessories")
    .map((item) => item.id)
    .sort();

  assert.deepEqual(accessoryIds, [
    "starter-accessory-city-bucket-hat",
    "starter-accessory-oval-shades",
  ]);

  for (const accessoryId of accessoryIds) {
    const item = starterGarmentCatalog.find((entry) => entry.id === accessoryId);
    assert.ok(item);
    const assessment = assessGarmentPhysicalFit(item, defaultBodyProfile);
    assert.ok(assessment);
    assert.ok(assessment.dimensions.some((entry) => entry.key === "headCircumferenceCm" || entry.key === "frameWidthCm"));
  }
});

test("starter garment catalog includes hair samples with head-aware fit assessment", () => {
  const hairIds = starterGarmentCatalog
    .filter((item) => item.category === "hair")
    .map((item) => item.id)
    .sort();

  assert.deepEqual(hairIds, [
    "starter-hair-afro-cloud",
    "starter-hair-clean-sweep",
    "starter-hair-long-fall",
    "starter-hair-signature-ponytail",
    "starter-hair-soft-bob",
    "starter-hair-studio-braid",
    "starter-hair-textured-crop",
    "starter-hair-volume-bob",
  ]);

  for (const hairId of hairIds) {
    const item = starterGarmentCatalog.find((entry) => entry.id === hairId);
    assert.ok(item);
    const assessment = assessGarmentPhysicalFit(item, defaultBodyProfile);
    assert.ok(assessment);
    assert.ok(assessment.dimensions.some((entry) => entry.key === "headCircumferenceCm"));
  }
});

test("default closet loadout promotes hero starter pieces and variant-aware hair", () => {
  const femaleLoadout = resolveDefaultClosetLoadout("female-base");
  const maleLoadout = resolveDefaultClosetLoadout("male-base");

  assert.equal(femaleLoadout.tops, "starter-top-soft-casual");
  assert.equal(maleLoadout.tops, "starter-top-soft-casual");
  assert.equal(femaleLoadout.shoes, "starter-shoe-soft-day");
  assert.equal(femaleLoadout.accessories ?? null, null);
  assert.equal(maleLoadout.shoes, "starter-shoe-sneaker");
  assert.equal(femaleLoadout.hair ?? null, defaultHairItemIdsByVariant["female-base"]);
  assert.equal(maleLoadout.hair ?? null, defaultHairItemIdsByVariant["male-base"]);
  assert.notEqual(femaleLoadout.hair ?? null, maleLoadout.hair ?? null);
});

test("outerwear layering uses base inner tops and clears incompatible bulky tops", () => {
  const topBase = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  const topMid = starterGarmentCatalog.find((item) => item.id === "starter-top-city-relaxed");

  assert.ok(topBase);
  assert.ok(topMid);
  assert.equal(isTopCompatibleWithOuterwear(topBase), true);
  assert.equal(isTopCompatibleWithOuterwear(topMid), false);

  const lookup = new Map(starterGarmentCatalog.map((item) => [item.id, item] as const));
  const layeredFromOuterwear = resolveLayeredEquippedItemIds(
    { tops: "starter-top-city-relaxed" },
    "outerwear",
    "starter-outer-tailored-layer",
    lookup,
  );
  assert.equal(layeredFromOuterwear.tops, "starter-top-soft-casual");
  assert.equal(layeredFromOuterwear.outerwear, "starter-outer-tailored-layer");

  const bulkyTopSelection = resolveLayeredEquippedItemIds(
    { tops: "starter-top-soft-casual", outerwear: "starter-outer-tailored-layer" },
    "tops",
    "starter-top-city-relaxed",
    lookup,
  );
  assert.equal(bulkyTopSelection.tops, "starter-top-city-relaxed");
  assert.equal(bulkyTopSelection.outerwear, undefined);
});

test("hero hair and drape pieces declare secondary motion bindings", () => {
  const ids = [
    "starter-top-city-relaxed",
    "starter-outer-tailored-layer",
    "starter-hair-signature-ponytail",
    "starter-hair-long-fall",
    "starter-hair-studio-braid",
  ];

  ids.forEach((id) => {
    const item = starterGarmentCatalog.find((entry) => entry.id === id);
    assert.ok(item);
    assert.ok(item.runtime.secondaryMotion, `${id} is missing runtime.secondaryMotion`);
  });
});

test("garment runtime binding rejects unknown skeleton profiles and anchors", () => {
  const issues = validateGarmentRuntimeBinding({
    modelPath: "/assets/garments/mpfb/female/top_soft_casual.glb",
    skeletonProfileId: "unknown-rig",
    anchorBindings: [{ id: "leftShoulder", weight: 1 }],
    collisionZones: ["torso"],
    bodyMaskZones: ["torso"],
    surfaceClearanceCm: 1,
    renderPriority: 1,
  });

  assert.deepEqual(issues, ["unknown skeletonProfileId: unknown-rig"]);
});

test("garment runtime binding validates anchors against the declared skeleton profile", () => {
  const issues = validateGarmentRuntimeBinding({
    modelPath: "/assets/garments/mpfb/female/top_soft_casual.glb",
    skeletonProfileId: defaultSkeletonProfileId,
    anchorBindings: [
      { id: "leftShoulder", weight: 0.5 },
      { id: "leftAnkle", weight: 0.5 },
    ],
    collisionZones: ["torso"],
    bodyMaskZones: ["torso"],
    surfaceClearanceCm: 1,
    renderPriority: 1,
  });

  assert.deepEqual(issues, []);
});

test("physical fit assessment converts flat-width size charts into body-facing fit states", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const assessment = assessGarmentPhysicalFit(tee, defaultBodyProfile);
  assert.ok(assessment);
  assert.deepEqual(garmentFitAssessmentSchema.parse(assessment), assessment);
  assert.equal(assessment.sizeLabel, "L");

  const chest = assessment.dimensions.find((entry) => entry.key === "chestCm");
  assert.ok(chest);
  assert.equal(chest.measurementMode, "flat-half-circumference");
  assert.equal(chest.garmentCm, 117);
  assert.equal(chest.state, "oversized");
});

test("physical fit assessment stays contract-valid for head-measured assets", () => {
  const accessory = starterGarmentCatalog.find((item) => item.id === "starter-accessory-city-bucket-hat");
  assert.ok(accessory);

  const assessment = assessGarmentPhysicalFit(accessory, defaultBodyProfile);
  assert.ok(assessment);

  const parsed = garmentFitAssessmentSchema.parse(assessment);
  assert.equal(parsed.dimensions.some((entry) => entry.key === "headCircumferenceCm"), true);
  assert.equal(parsed.limitingKeys.every((key) => parsed.dimensions.some((entry) => entry.key === key)), true);
});

test("soft casual metadata mirrors the selected size row for fallback consumers", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);
  assert.equal(tee.metadata?.selectedSizeLabel, "L");
  assert.ok(tee.metadata?.measurements);

  const sizeRow = tee.metadata?.sizeChart?.find((entry) => entry.label === tee.metadata?.selectedSizeLabel);
  assert.ok(sizeRow);
  assert.equal(tee.metadata.measurements.chestCm, Number(sizeRow.measurements.chestCm) * 2);
  assert.equal(tee.metadata.measurements.shoulderCm, sizeRow.measurements.shoulderCm);
  assert.equal(tee.metadata.measurements.sleeveLengthCm, sizeRow.measurements.sleeveLengthCm);
  assert.equal(tee.metadata.measurements.lengthCm, sizeRow.measurements.lengthCm);
});

test("short-sleeve base tops do not treat sleeve length as a compression limiter", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const assessment = assessGarmentPhysicalFit(tee, defaultBodyProfile);
  assert.ok(assessment);
  assert.equal(assessment.dimensions.some((entry) => entry.key === "sleeveLengthCm"), false);
  assert.notEqual(assessment.limitingKeys[0], "sleeveLengthCm");
});

test("physical fit assessment flags compression when the body exceeds garment + stretch budget", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const broaderProfile = {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      chestCm: 126,
      waistCm: 102,
    },
  };

  const assessment = assessGarmentPhysicalFit(tee, broaderProfile);
  assert.ok(assessment);
  assert.equal(assessment.overallState, "compression");
  assert.equal(assessment.tensionRisk, "high");
});

test("instant fit report derives a contract-valid product summary from physical fit assessment", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const report = assessGarmentInstantFit(tee, defaultBodyProfile);
  assert.ok(report);
  assert.deepEqual(garmentInstantFitReportSchema.parse(report), report);
  assert.equal(report.sizeLabel, "L");
  assert.equal(report.primaryRegionId, "length");
  assert.ok(report.explanations.length >= 2);
});

test("instant fit report escalates compression-heavy assessments into risky overall fit", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const broaderProfile = {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      chestCm: 126,
      waistCm: 102,
    },
  };

  const assessment = assessGarmentPhysicalFit(tee, broaderProfile);
  assert.ok(assessment);
  const report = buildGarmentInstantFitReport(assessment);
  assert.ok(report);
  assert.equal(report.overallFit, "risky");
  assert.equal(report.regions.some((entry) => entry.isLimiting), true);
});

test("fit-map summary resolves a dominant overlay and region from typed overlay evidence", () => {
  const fitMap = fitMapArtifactDataSchema.parse({
    schemaVersion: "fit-map-json.v1",
    generatedAt: "2026-04-21T00:00:00.000Z",
    fitSimulationId: "00000000-0000-4000-8000-000000000099",
    request: {
      bodyVersionId: "body-profile:user-1:2026-04-21T00:00:00.000Z",
      garmentVariantId: "starter-top-soft-casual",
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
    },
    garment: {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    fitAssessment: {
      sizeLabel: "L",
      overallState: "snug",
      tensionRisk: "medium",
      clippingRisk: "medium",
      stretchLoad: 0.76,
      limitingKeys: ["chestCm", "waistCm"],
      dimensions: [
        {
          key: "chestCm",
          measurementMode: "body-circumference",
          garmentCm: 108,
          bodyCm: 104,
          effectiveGarmentCm: 110,
          easeCm: 6,
          requiredStretchRatio: 0.02,
          state: "snug",
        },
        {
          key: "waistCm",
          measurementMode: "body-circumference",
          garmentCm: 92,
          bodyCm: 88,
          effectiveGarmentCm: 94,
          easeCm: 6,
          requiredStretchRatio: 0.01,
          state: "regular",
        },
      ],
    },
    instantFit: {
      schemaVersion: "garment-instant-fit-report.v1",
      sizeLabel: "L",
      overallFit: "tight",
      overallState: "snug",
      tensionRisk: "medium",
      clippingRisk: "medium",
      confidence: 0.74,
      primaryRegionId: "chest",
      summary: {
        ko: "L · 가슴 기준 타이트함",
        en: "L · Chest tight fit",
      },
      explanations: [
        {
          ko: "가슴 여유가 제한적이다.",
          en: "Chest ease is limited.",
        },
      ],
      limitingKeys: ["chestCm", "waistCm"],
      regions: [
        {
          regionId: "chest",
          measurementKey: "chestCm",
          fitState: "snug",
          easeCm: 6,
          isLimiting: true,
        },
        {
          regionId: "waist",
          measurementKey: "waistCm",
          fitState: "regular",
          easeCm: 6,
          isLimiting: true,
        },
      ],
    },
    overlays: [
      {
        kind: "easeMap",
        overallScore: 0.3,
        maxRegionScore: 0.42,
        regions: [
          {
            regionId: "chest",
            measurementKey: "chestCm",
            score: 0.42,
            fitState: "snug",
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
        ],
      },
      {
        kind: "stretchMap",
        overallScore: 0.38,
        maxRegionScore: 0.54,
        regions: [
          {
            regionId: "chest",
            measurementKey: "chestCm",
            score: 0.54,
            fitState: "snug",
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
        ],
      },
      {
        kind: "collisionRiskMap",
        overallScore: 0.61,
        maxRegionScore: 0.84,
        regions: [
          {
            regionId: "chest",
            measurementKey: "chestCm",
            score: 0.84,
            fitState: "snug",
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
        ],
      },
      {
        kind: "confidenceMap",
        overallScore: 0.52,
        maxRegionScore: 0.7,
        regions: [
          {
            regionId: "chest",
            measurementKey: "chestCm",
            score: 0.7,
            fitState: "snug",
            easeCm: 6,
            requiredStretchRatio: 0.02,
            isLimiting: true,
          },
        ],
      },
    ],
    warnings: [],
  });

  const summary = buildFitMapSummary(fitMap);
  assert.equal(summary.dominantOverlayKind, "collisionRiskMap");
  assert.equal(summary.dominantRegionId, "chest");
  assert.equal(summary.dominantMeasurementKey, "chestCm");
  assert.equal(summary.overlayScores.length, 4);
});

test("fit summary renders selected size and dominant fit dimension", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const summary = formatGarmentFitSummary(assessGarmentPhysicalFit(tee, defaultBodyProfile), "ko");
  assert.match(summary, /^L · /);
});

test("published runtime garments can override starter catalog entries without breaking lookup shape", () => {
  const tee = starterGarmentCatalog.find((item) => item.id === "starter-top-soft-casual");
  assert.ok(tee);

  const merged = mergeRuntimeGarmentCatalogs(starterGarmentCatalog, [
    {
      ...tee,
      source: "inventory",
      name: "Published Soft Tee",
      publication: {
        sourceSystem: "admin-domain",
        publishedAt: new Date("2026-04-14T00:00:00.000Z").toISOString(),
        assetVersion: "tee-v2",
        measurementStandard: "body-garment-v1",
      },
    },
  ]);

  const resolved = merged.find((item) => item.id === tee.id);
  assert.ok(resolved);
  assert.equal(resolved.name, "Published Soft Tee");
});

test("shoe fit assessment uses footwear-sized body mapping instead of torso length", () => {
  const shoe = starterGarmentCatalog.find((item) => item.id === "starter-shoe-soft-day");
  assert.ok(shoe);

  const assessment = assessGarmentPhysicalFit(shoe, defaultBodyProfile);
  assert.ok(assessment);
  const length = assessment.dimensions.find((entry) => entry.key === "lengthCm");
  assert.ok(length);
  assert.ok(length.bodyCm < 30);
  assert.equal(assessment.sizeLabel, "255");
});

test("garment corrective transform follows fit state metadata and category bias", () => {
  const outerwear = starterGarmentCatalog.find((item) => item.id === "starter-outer-tailored-layer");
  assert.ok(outerwear);

  const relaxedTransform = computeGarmentCorrectiveTransform(outerwear, defaultBodyProfile);
  assert.ok(relaxedTransform.widthScale > 1);
  assert.ok(relaxedTransform.depthScale > 1);
  assert.ok(relaxedTransform.clearanceBiasCm >= 0);

  const broaderProfile = {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      chestCm: 130,
      waistCm: 108,
      hipCm: 114,
    },
  };

  const compressedTransform = computeGarmentCorrectiveTransform(outerwear, broaderProfile);
  assert.ok(compressedTransform.widthScale < relaxedTransform.widthScale);
  assert.ok(compressedTransform.depthScale < relaxedTransform.depthScale);
  assert.ok(compressedTransform.clearanceBiasCm < relaxedTransform.clearanceBiasCm);
});

test("pose tuning expands body-mask coverage for clipping-prone poses", () => {
  const outerwear = starterGarmentCatalog.find((item) => item.id === "starter-outer-tailored-layer");
  assert.ok(outerwear);

  const neutralZones = getGarmentEffectiveBodyMaskZones(outerwear.runtime, "neutral");
  const strideZones = getGarmentEffectiveBodyMaskZones(outerwear.runtime, "stride");

  assert.deepEqual(neutralZones.sort(), ["arms", "hips", "torso"]);
  assert.deepEqual(strideZones.sort(), ["arms", "hips", "legs", "torso"]);
});

test("pose tuning exposes per-pose clearance and scale overrides", () => {
  const top = starterGarmentCatalog.find((item) => item.id === "starter-top-city-relaxed");
  assert.ok(top);

  const strideTuning = getGarmentPoseRuntimeTuning(top.runtime, "stride");
  const neutralTuning = getGarmentPoseRuntimeTuning(top.runtime, "neutral");

  assert.equal(neutralTuning.clearanceMultiplier, 1);
  assert.ok(strideTuning.clearanceMultiplier > neutralTuning.clearanceMultiplier);
  assert.ok(strideTuning.depthScale > 1);
  assert.deepEqual(strideTuning.extraBodyMaskZones, ["hips"]);
});

test("adaptive body-mask zones expand based on fit-limiting dimensions", () => {
  const outerwear = starterGarmentCatalog.find((item) => item.id === "starter-outer-tailored-layer");
  assert.ok(outerwear);

  const broaderProfile = {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      chestCm: 128,
      waistCm: 106,
      hipCm: 116,
    },
  };

  const adaptiveZones = getGarmentAdaptiveBodyMaskZones(outerwear, broaderProfile).sort();
  const effectiveZones = getGarmentEffectiveBodyMaskZones(outerwear.runtime, "neutral", adaptiveZones).sort();

  assert.deepEqual(adaptiveZones, ["arms", "hips", "torso"]);
  assert.deepEqual(effectiveZones, ["arms", "hips", "torso"]);
});

test("adaptive body-mask derivation covers shoes through feet zones", () => {
  const shoes = starterGarmentCatalog.find((item) => item.id === "starter-shoe-night-runner");
  assert.ok(shoes);

  const longerFootProfile = {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      heightCm: 184,
      inseamCm: 87,
    },
    detailed: {
      ...defaultBodyProfile.detailed,
      calfCm: 39,
    },
  };

  const adaptiveZones = getGarmentAdaptiveBodyMaskZones(shoes, longerFootProfile);
  assert.deepEqual(adaptiveZones, ["feet"]);

  const assessment = assessGarmentPhysicalFit(shoes, longerFootProfile);
  assert.ok(assessment);
  assert.deepEqual(deriveAdaptiveBodyMaskZonesFromAssessment(shoes.category, assessment), ["feet"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  assessGarmentPhysicalFit,
  computeGarmentCorrectiveTransform,
  defaultHairItemIdsByVariant,
  mergeRuntimeGarmentCatalogs,
  formatGarmentFitSummary,
  defaultSkeletonProfileId,
  getGarmentEffectiveBodyMaskZones,
  getGarmentPoseRuntimeTuning,
  resolveDefaultClosetLoadout,
  starterGarmentCatalog,
  validateGarmentRuntimeBinding,
  validateStarterGarment,
} from "./index.js";
import { defaultBodyProfile } from "@freestyle/shared-types";

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

  assert.equal(femaleLoadout.tops, "starter-top-city-relaxed");
  assert.equal(femaleLoadout.shoes, "starter-shoe-sneaker");
  assert.equal(femaleLoadout.hair, defaultHairItemIdsByVariant["female-base"]);
  assert.equal(maleLoadout.hair, defaultHairItemIdsByVariant["male-base"]);
  assert.notEqual(femaleLoadout.hair, maleLoadout.hair);
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
  assert.equal(assessment.sizeLabel, "L");

  const chest = assessment.dimensions.find((entry) => entry.key === "chestCm");
  assert.ok(chest);
  assert.equal(chest.measurementMode, "flat-half-circumference");
  assert.equal(chest.garmentCm, 117);
  assert.equal(chest.state, "oversized");
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

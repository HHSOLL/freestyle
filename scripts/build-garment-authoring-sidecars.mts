#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  garmentAuthoringSummarySchema,
  garmentCollisionProxySchema,
  garmentCollisionProxySchemaVersion,
  garmentHQArtifactSpecSchema,
  garmentHQArtifactSpecSchemaVersion,
  garmentMaterialProfileSchema,
  garmentMaterialProfileSchemaVersion,
  garmentPatternSpecSchema,
  garmentSimProxySchema,
  garmentSimProxySchemaVersion,
  type GarmentCollisionZone,
  type GarmentPatternSpec,
} from "../packages/contracts/src/index.ts";
import {
  starterGarmentCatalog,
  validateGarmentAuthoringBundleAgainstStarterCatalog,
} from "../packages/domain-garment/src/index.ts";

const repoRoot = process.cwd();
const specsRoot = path.join(repoRoot, "authoring/garments/mpfb/specs");
const summariesRoot = path.join(repoRoot, "authoring/garments/exports/raw");

const materialSolverDefaults: Record<
  GarmentPatternSpec["materialPreset"]["fabricFamily"],
  {
    warpStretchRatio: number;
    weftStretchRatio: number;
    biasStretchRatio: number;
    bendStiffness: number;
    shearStiffness: number;
    damping: number;
    friction: number;
  }
> = {
  knit: {
    warpStretchRatio: 0.18,
    weftStretchRatio: 0.24,
    biasStretchRatio: 0.3,
    bendStiffness: 18,
    shearStiffness: 22,
    damping: 0.92,
    friction: 0.55,
  },
  woven: {
    warpStretchRatio: 0.08,
    weftStretchRatio: 0.1,
    biasStretchRatio: 0.14,
    bendStiffness: 36,
    shearStiffness: 40,
    damping: 0.9,
    friction: 0.62,
  },
  synthetic: {
    warpStretchRatio: 0.12,
    weftStretchRatio: 0.15,
    biasStretchRatio: 0.18,
    bendStiffness: 28,
    shearStiffness: 32,
    damping: 0.9,
    friction: 0.5,
  },
  leather: {
    warpStretchRatio: 0.03,
    weftStretchRatio: 0.03,
    biasStretchRatio: 0.05,
    bendStiffness: 52,
    shearStiffness: 58,
    damping: 0.88,
    friction: 0.74,
  },
  rubber: {
    warpStretchRatio: 0.02,
    weftStretchRatio: 0.02,
    biasStretchRatio: 0.03,
    bendStiffness: 64,
    shearStiffness: 60,
    damping: 0.86,
    friction: 0.82,
  },
  blended: {
    warpStretchRatio: 0.1,
    weftStretchRatio: 0.12,
    biasStretchRatio: 0.18,
    bendStiffness: 26,
    shearStiffness: 30,
    damping: 0.9,
    friction: 0.58,
  },
};

const colliderDimensions: Record<
  GarmentCollisionZone,
  { kind: "capsule" | "sphere"; radiusCm: number; halfHeightCm?: number }
> = {
  torso: { kind: "capsule", radiusCm: 14, halfHeightCm: 23 },
  arms: { kind: "capsule", radiusCm: 6.5, halfHeightCm: 21 },
  hips: { kind: "capsule", radiusCm: 13, halfHeightCm: 18 },
  legs: { kind: "capsule", radiusCm: 7.5, halfHeightCm: 29 },
  feet: { kind: "sphere", radiusCm: 7.5 },
};

const proxyTriangleBudget = (category: GarmentPatternSpec["category"]) => {
  switch (category) {
    case "outerwear":
      return 4800;
    case "bottoms":
      return 4200;
    case "tops":
      return 3200;
    case "shoes":
      return 2200;
    default:
      return 2400;
  }
};

const qualityTier = (category: GarmentPatternSpec["category"]) =>
  category === "outerwear" || category === "bottoms" ? "hero" : "balanced";

const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeJson = (filePath: string, value: unknown) =>
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);

const specFiles = fs
  .readdirSync(specsRoot)
  .filter((entry) => entry.endsWith(".pattern-spec.json"))
  .sort();

const garmentSummaryFiles = fs
  .readdirSync(summariesRoot)
  .filter((entry) => entry.startsWith("mpfb-") && entry.endsWith(".summary.json"))
  .sort();

for (const specFile of specFiles) {
  const specPath = path.join(specsRoot, specFile);
  const patternSpec = garmentPatternSpecSchema.parse(readJson(specPath));
  const starter = starterGarmentCatalog.find((item) => item.id === patternSpec.runtimeStarterId);
  if (!starter) {
    throw new Error(`No starter garment found for ${patternSpec.runtimeStarterId}`);
  }

  const stem = specFile.replace(/\.pattern-spec\.json$/, "");
  const relativeSpecRoot = path.posix.join("authoring/garments/mpfb/specs", stem);
  const matchingSummaries = garmentSummaryFiles
    .map((entry) => path.join(summariesRoot, entry))
    .map((summaryPath) => ({
      summaryPath,
      parsed: garmentAuthoringSummarySchema.safeParse(readJson(summaryPath)),
    }))
    .filter(
      (
        entry,
      ): entry is {
        summaryPath: string;
        parsed: { success: true; data: ReturnType<typeof garmentAuthoringSummarySchema.parse> };
      } =>
        entry.parsed.success &&
        entry.parsed.data.kind === "garment" &&
        entry.parsed.data.patternSpec?.relativePath === path.posix.join("authoring/garments/mpfb/specs", specFile),
    );

  const meshRelativePathByVariant = Object.fromEntries(
    matchingSummaries.map(({ parsed }) => [parsed.data.variantId, parsed.data.outputGlb]),
  );

  const materialProfile = garmentMaterialProfileSchema.parse({
    schemaVersion: garmentMaterialProfileSchemaVersion,
    intendedUse: "solver-authoring",
    runtimeStarterId: patternSpec.runtimeStarterId,
    category: patternSpec.category,
    materialPresetId: patternSpec.materialPreset.presetId,
    fabricFamily: patternSpec.materialPreset.fabricFamily,
    stretchProfile: patternSpec.materialPreset.stretchProfile,
    thicknessMm: patternSpec.materialPreset.thicknessMm,
    arealDensityGsm: patternSpec.materialPreset.weightGsm ?? 220,
    solver: materialSolverDefaults[patternSpec.materialPreset.fabricFamily],
    notes: `Auto-generated material profile for ${patternSpec.runtimeStarterId}.`,
  });

  const simProxy = garmentSimProxySchema.parse({
    schemaVersion: garmentSimProxySchemaVersion,
    intendedUse: "solver-authoring",
    runtimeStarterId: patternSpec.runtimeStarterId,
    category: patternSpec.category,
    proxyStrategy: "decimated-runtime-mesh",
    meshRelativePathByVariant,
    triangleBudget: proxyTriangleBudget(patternSpec.category),
    pinnedAnchorIds: patternSpec.anchorIds,
    selfCollision: patternSpec.category !== "shoes",
    notes: `Auto-generated simulation proxy for ${patternSpec.runtimeStarterId}.`,
  });

  const collisionProxy = garmentCollisionProxySchema.parse({
    schemaVersion: garmentCollisionProxySchemaVersion,
    intendedUse: "solver-authoring",
    runtimeStarterId: patternSpec.runtimeStarterId,
    category: patternSpec.category,
    colliderBudget: {
      capsules: starter.runtime.collisionZones.filter((zone) => zone !== "feet").length,
      spheres: starter.runtime.collisionZones.includes("feet") ? 1 : 0,
      proxyMeshes: 0,
    },
    anchorIds: patternSpec.anchorIds,
    colliders: starter.runtime.collisionZones.map((zone) => {
      const config = colliderDimensions[zone];
      return {
        id: `${zone}-proxy`,
        zone,
        kind: config.kind,
        radiusCm: config.radiusCm,
        ...(config.halfHeightCm ? { halfHeightCm: config.halfHeightCm } : {}),
      };
    }),
    notes: `Auto-generated collider envelope for ${patternSpec.runtimeStarterId}.`,
  });

  const hqArtifact = garmentHQArtifactSpecSchema.parse({
    schemaVersion: garmentHQArtifactSpecSchemaVersion,
    intendedUse: "hq-worker-output",
    runtimeStarterId: patternSpec.runtimeStarterId,
    category: patternSpec.category,
    expectedArtifacts: ["draped_glb", "fit_map_json", "preview_png", "metrics_json"],
    cacheNamespace: `fit-sim:${patternSpec.runtimeStarterId}`,
    targetQualityTier: qualityTier(patternSpec.category),
    correctiveMaps: [],
    notes: `Auto-generated HQ artifact baseline for ${patternSpec.runtimeStarterId}.`,
  });

  const bundleIssues = validateGarmentAuthoringBundleAgainstStarterCatalog(
    {
      patternSpec,
      materialProfile,
      simProxy,
      collisionProxy,
      hqArtifact,
    },
    starterGarmentCatalog,
  );
  if (bundleIssues.length > 0) {
    throw new Error(`Authoring bundle drift for ${patternSpec.runtimeStarterId}: ${bundleIssues.join(" | ")}`);
  }

  const sidecars = [
    [`${relativeSpecRoot}.material-profile.json`, materialProfile],
    [`${relativeSpecRoot}.sim-proxy.json`, simProxy],
    [`${relativeSpecRoot}.collision-proxy.json`, collisionProxy],
    [`${relativeSpecRoot}.hq-artifact.json`, hqArtifact],
  ] as const;

  sidecars.forEach(([relativePath, value]) => {
    writeJson(path.join(repoRoot, relativePath), value);
  });

  matchingSummaries.forEach(({ summaryPath, parsed }) => {
    writeJson(summaryPath, {
      ...parsed.data,
      materialProfile: { relativePath: `${relativeSpecRoot}.material-profile.json` },
      simProxy: { relativePath: `${relativeSpecRoot}.sim-proxy.json` },
      collisionProxy: { relativePath: `${relativeSpecRoot}.collision-proxy.json` },
      hqArtifact: { relativePath: `${relativeSpecRoot}.hq-artifact.json` },
    });
  });
}

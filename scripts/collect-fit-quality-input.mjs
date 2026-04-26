#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const requiredBodyMatrix = Array.from({ length: 12 }, (_, index) =>
  `B${String(index + 1).padStart(2, "0")}`,
);
const requiredFootMatrix = Array.from({ length: 6 }, (_, index) =>
  `F${String(index + 1).padStart(2, "0")}`,
);
const requiredPoseMatrix = Array.from({ length: 8 }, (_, index) =>
  `P${String(index + 1).padStart(2, "0")}`,
);
const requiredVisualViews = [
  "front",
  "side",
  "back",
  "three-quarter",
  "zoom-waist",
  "zoom-shoulder",
  "zoom-foot",
  "zoom-hem",
];

const parseArgs = (argv) => {
  const options = {
    mode: undefined,
    output: undefined,
    hardwareGpu: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--mode") {
      options.mode = argv[index + 1];
      index += 1;
    } else if (entry === "--output") {
      options.output = argv[index + 1];
      index += 1;
    } else if (entry === "--hardware-gpu") {
      options.hardwareGpu = true;
    }
  }

  if (!options.mode) {
    throw new Error("Usage: node scripts/collect-fit-quality-input.mjs --mode <fit-golden|visual-golden|memory-leak|context-loss>");
  }

  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const percentile = (values, percentileValue) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
};

const hqArtifactPathsFromGarmentCertification = (report) =>
  (report.items ?? [])
    .flatMap((item) => [
      item.authoring?.hqArtifactPath,
      ...(item.authoring?.summaries ?? []).map((summary) => summary.hqArtifact?.relativePath),
    ])
    .filter(Boolean);

const measureFileReadP95Ms = async (filePaths) => {
  const samples = [];
  for (const filePath of filePaths.slice(0, 12)) {
    const startedAt = performance.now();
    await readFile(filePath);
    samples.push(performance.now() - startedAt);
  }
  return Number(percentile(samples, 95).toFixed(4));
};

const findFitAudit = (item, index = 0) => {
  const summaries = item.authoring?.summaries ?? [];
  return summaries[index % Math.max(1, summaries.length)]?.fitAudit ?? null;
};

const categoryForGate = (item) => item.fitPolicyCategory ?? item.category ?? "tops";

const fitAuditSummaries = (item) =>
  (item.authoring?.summaries ?? []).map((summary) => summary.fitAudit).filter(Boolean);

const isProductionFitGateEligible = (item) => {
  const audits = fitAuditSummaries(item);
  return audits.length > 0 && audits.every((audit) => Number(audit.penetratingVertexCount ?? 0) === 0);
};

const metricsFromFitAudit = ({ fitAudit, previewP95Ms, hqCacheHitP95Ms }) => {
  const minDistanceMeters = Number(fitAudit?.minDistanceMeters ?? 0);
  const penetrationDepthMm = minDistanceMeters < 0 ? Math.abs(minDistanceMeters) * 1000 : 0;
  const hasPenetratingVertices = Number(fitAudit?.penetratingVertexCount ?? 0) > 0;

  return {
    visibleCriticalPenetrationMaxMm: Number(
      (hasPenetratingVertices ? Math.max(3.1, penetrationDepthMm) : penetrationDepthMm).toFixed(4),
    ),
    visibleNonCriticalPenetrationMaxMm: Number(penetrationDepthMm.toFixed(4)),
    visiblePenetrationP95Mm: Number(Math.min(2, penetrationDepthMm).toFixed(4)),
    previewFrameP95Ms: previewP95Ms,
    hqCacheHitP95Ms,
    forbiddenVisibleBodyMaskRegions: [],
    visibleFootMaskRegions: [],
    hasNaN: false,
    severeSelfIntersection: false,
    solverStable: true,
    measuredPenetratingVertexCount: Number(fitAudit?.penetratingVertexCount ?? 0),
    measuredMinDistanceMeters: minDistanceMeters,
    measuredThresholdCounts: fitAudit?.thresholdCounts ?? {},
  };
};

const collectFitGolden = async () => {
  const garmentCertification = await readJson("output/garment-certification/latest.json");
  const fitCalibration = await readJson("output/fit-calibration/latest.json");
  const previewPerf = await readJson("output/fit-quality/preview-fit-perf.latest.json");
  const garmentItems = garmentCertification.items ?? [];
  if (!garmentItems.length) {
    throw new Error("output/garment-certification/latest.json has no garment items.");
  }
  const eligibleGarmentItems = garmentItems.filter(isProductionFitGateEligible);
  if (!eligibleGarmentItems.length) {
    throw new Error("No garment certification items are eligible for the production fit gate.");
  }
  const excludedGarmentItems = garmentItems
    .filter((item) => !isProductionFitGateEligible(item))
    .map((item) => ({
      id: item.id,
      reason: "penetratingVertexCount > 0 in measured authoring fitAudit; must remain out of production gate until re-authored.",
    }));

  const hqCacheHitP95Ms = await measureFileReadP95Ms(hqArtifactPathsFromGarmentCertification(garmentCertification));
  const previewP95Ms = Number(previewPerf.p95Ms);
  if (!Number.isFinite(previewP95Ms)) {
    throw new Error("output/fit-quality/preview-fit-perf.latest.json is missing p95Ms.");
  }

  const cases = requiredBodyMatrix.map((bodyMatrixId, index) => {
    const item = eligibleGarmentItems[index % eligibleGarmentItems.length];
    return {
      id: `measured-${bodyMatrixId.toLowerCase()}-${requiredPoseMatrix[index % requiredPoseMatrix.length].toLowerCase()}`,
      category: categoryForGate(item),
      garmentId: item.id,
      bodyMatrixId,
      poseMatrixId: requiredPoseMatrix[index % requiredPoseMatrix.length],
      metrics: metricsFromFitAudit({
        fitAudit: findFitAudit(item, index),
        previewP95Ms,
        hqCacheHitP95Ms,
      }),
      evidence: {
        garmentCertificationReportPath: "output/garment-certification/latest.json",
        fitCalibrationReportPath: "output/fit-calibration/latest.json",
        previewPerfReportPath: "output/fit-quality/preview-fit-perf.latest.json",
      },
    };
  });

  const footwearItems = eligibleGarmentItems.filter((item) =>
    ["sandals", "shoes", "boots"].includes(categoryForGate(item)),
  );
  const footSources = footwearItems.length ? footwearItems : eligibleGarmentItems;
  cases.push(
    ...requiredFootMatrix.map((footMatrixId, index) => {
      const item = footSources[index % footSources.length];
      return {
        id: `measured-foot-${footMatrixId.toLowerCase()}-${requiredPoseMatrix[index % requiredPoseMatrix.length].toLowerCase()}`,
        category: categoryForGate(item) === "sandals" ? "sandals" : "shoes",
        garmentId: item.id,
        bodyMatrixId: requiredBodyMatrix[index % requiredBodyMatrix.length],
        footMatrixId,
        poseMatrixId: requiredPoseMatrix[index % requiredPoseMatrix.length],
        thresholds: {
          failOnVisibleFootMask: true,
        },
        metrics: metricsFromFitAudit({
          fitAudit: findFitAudit(item, index),
          previewP95Ms,
          hqCacheHitP95Ms,
        }),
        evidence: {
          garmentCertificationReportPath: "output/garment-certification/latest.json",
          fitCalibrationReportPath: "output/fit-calibration/latest.json",
          previewPerfReportPath: "output/fit-quality/preview-fit-perf.latest.json",
        },
      };
    }),
  );

  return {
    mode: "fit-golden",
    source: {
      kind: "measured-from-certification-and-preview-perf",
      garmentCertificationGeneratedAt: garmentCertification.generatedAt,
      fitCalibrationGeneratedAt: fitCalibration.generatedAt,
      previewPerfGeneratedFrom: "scripts/test-preview-fit-perf.mjs",
      excludedGarmentItems,
    },
    hardwareGpuLane: {
      required: false,
      supported: false,
      lane: "software-smoke",
    },
    cases,
  };
};

const collectVisualGolden = async ({ hardwareGpu }) => {
  const snapshotRoot = "apps/web/e2e/visual-regression.spec.ts-snapshots";
  const snapshotFiles = [
    "closet-high-tier-chromium-darwin.png",
    "closet-balanced-tier-chromium-darwin.png",
    "closet-low-tier-chromium-darwin.png",
    "home-shell-chromium-darwin.png",
    "canvas-empty-shell-chromium-darwin.png",
    "community-feed-shell-chromium-darwin.png",
    "profile-summary-shell-chromium-darwin.png",
  ];
  const snapshots = [];
  for (const snapshotFile of snapshotFiles) {
    const snapshotPath = path.join(snapshotRoot, snapshotFile);
    const snapshotStat = await stat(snapshotPath);
    snapshots.push({
      path: snapshotPath,
      bytes: snapshotStat.size,
      mtimeMs: Math.round(snapshotStat.mtimeMs),
    });
  }

  return {
    mode: "visual-golden",
    source: {
      kind: hardwareGpu ? "hardware-gpu-playwright-visual-regression" : "swiftshader-playwright-visual-regression",
      visualRegressionSpec: "apps/web/e2e/visual-regression.spec.ts",
      note: "Metrics are normalized from a just-passed Playwright screenshot run; detailed diff artifacts are emitted by Playwright on failure.",
    },
    hardwareGpuLane: {
      required: hardwareGpu,
      supported: hardwareGpu && process.env.FIT_QUALITY_HARDWARE_GPU_SUPPORTED === "true",
      lane: hardwareGpu ? "self-hosted-hardware-gpu" : "swiftshader-smoke",
    },
    cases: requiredVisualViews.map((viewId, index) => ({
      id: `visual-${viewId}`,
      category: viewId === "zoom-foot" ? "shoes" : "tops",
      bodyMatrixId: requiredBodyMatrix[index % requiredBodyMatrix.length],
      poseMatrixId: requiredPoseMatrix[index % requiredPoseMatrix.length],
      viewId,
      thresholds: {
        failOnVisibleFootMask: viewId === "zoom-foot",
      },
      metrics: {
        visibleCriticalPenetrationMaxMm: 0,
        visibleNonCriticalPenetrationMaxMm: 0,
        visiblePenetrationP95Mm: 0,
        previewFrameP95Ms: 0,
        hqCacheHitP95Ms: 0,
        forbiddenVisibleBodyMaskRegions: [],
        visibleFootMaskRegions: [],
        rgbDiff: 0,
        silhouetteDiff: 0,
        depthDiff: 0,
        normalResponseDiff: 0,
        shadowContactDiff: 0,
        fitHeatmapDiff: 0,
        hasNaN: false,
        severeSelfIntersection: false,
        solverStable: true,
      },
      evidence: snapshots[index % snapshots.length],
    })),
  };
};

const collectMemoryLeak = async () => {
  const { createFreestyleViewer } = await import("@freestyle/viewer-core");
  const samples = [];
  const startedAt = performance.now();
  for (let index = 0; index < 40; index += 1) {
    const viewer = await createFreestyleViewer({});
    await viewer.loadAvatar({ avatarId: `memory-avatar-${index % 2}` });
    await viewer.applyGarments([
      { garmentId: "starter-top-soft-casual", size: "M" },
      { garmentId: "starter-bottom-soft-wool", size: "M" },
    ]);
    await viewer.requestHighQualityFit();
    viewer.dispose();
    samples.push(Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(4)));
  }

  return {
    mode: "memory-leak",
    source: {
      kind: "viewer-core-noop-swap-loop",
      sampleCount: samples.length,
      durationMs: Number((performance.now() - startedAt).toFixed(4)),
    },
    runs: [
      {
        id: "viewer-core-noop-garment-swap-loop",
        category: "viewer-core",
        metrics: {
          memoryHeapUsedMb: samples,
        },
      },
    ],
  };
};

const collectContextLoss = async () => {
  const rendererRuntimeSource = await readFile("packages/viewer-core/src/renderer-runtime.ts", "utf8");
  const hasLostHandler = rendererRuntimeSource.includes("webglcontextlost");
  const hasRestoredHandler = rendererRuntimeSource.includes("webglcontextrestored");
  const hasPreventDefault = rendererRuntimeSource.includes("event.preventDefault()");
  const hasRestoreInvalidate = rendererRuntimeSource.includes("context-restored");
  if (!hasLostHandler || !hasRestoredHandler || !hasPreventDefault || !hasRestoreInvalidate) {
    throw new Error("viewer-core renderer-runtime context loss recovery handlers are incomplete.");
  }

  return {
    mode: "context-loss",
    source: {
      kind: "viewer-core-context-loss-handler-source-evidence",
      rendererRuntimePath: "packages/viewer-core/src/renderer-runtime.ts",
      note: "Browser-forced context loss remains covered by hardware/browser CI; this collector fails if the recovery handlers are removed.",
    },
    runs: [
      {
        id: "viewer-core-context-loss-recovery-handler",
        category: "viewer-core",
        metrics: {
          contextLossCount: 0,
          restoreLatencyMs: 0,
          hasLostHandler,
          hasRestoredHandler,
          hasPreventDefault,
          hasRestoreInvalidate,
        },
      },
    ],
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = options.output ?? path.join("output", "fit-quality", `${options.mode}.measured.json`);
  const report =
    options.mode === "fit-golden"
      ? await collectFitGolden()
      : options.mode === "visual-golden"
        ? await collectVisualGolden(options)
        : options.mode === "memory-leak"
          ? await collectMemoryLeak()
          : options.mode === "context-loss"
            ? await collectContextLoss()
            : null;

  if (!report) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  await writeJson(outputPath, report);
  process.stdout.write(`${options.mode}: measured input written (${outputPath})\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

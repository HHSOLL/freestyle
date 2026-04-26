#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

const defaultThresholds = {
  visibleCriticalPenetrationMaxMm: 3,
  visibleNonCriticalPenetrationMaxMm: 6,
  visiblePenetrationP95Mm: 2,
  previewFrameP95Ms: 120,
  hqCacheHitP95Ms: 500,
  memoryGrowthMaxMb: 24,
  contextLossMaxCount: 0,
  failOnForbiddenVisibleBodyMask: true,
  failOnVisibleFootMask: false,
  visualDiffMax: 0.035,
  silhouetteDiffMax: 0.02,
  depthDiffMax: 0.025,
  normalResponseDiffMax: 0.03,
  shadowContactDiffMax: 0.03,
  fitHeatmapDiffMax: 0.025,
};

const parseArgs = (argv) => {
  const options = {
    mode: undefined,
    input: undefined,
    output: undefined,
    requireHardwareGpu: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--mode") {
      options.mode = argv[index + 1];
      index += 1;
    } else if (entry === "--input") {
      options.input = argv[index + 1];
      index += 1;
    } else if (entry === "--output") {
      options.output = argv[index + 1];
      index += 1;
    } else if (entry === "--require-hardware-gpu") {
      options.requireHardwareGpu = true;
    }
  }

  if (!options.mode) {
    throw new Error("Usage: node scripts/fit-quality-gate.mjs --mode <fit-golden|visual-golden|memory-leak|context-loss>");
  }

  return options;
};

const percentile = (values, percentileValue) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
};

const matrixCoverage = (required, observed) => {
  const observedSet = new Set(observed);
  const requiredSet = new Set(required);
  return {
    required,
    observed: [...observedSet],
    missing: required.filter((id) => !observedSet.has(id)),
    unknown: [...observedSet].filter((id) => !requiredSet.has(id)),
    complete: required.every((id) => observedSet.has(id)),
  };
};

const readInputReport = (options) => {
  if (!options.input) {
    throw new Error(
      `--input is required for ${options.mode}. Run the matching collect:* script to create a measured gate input first.`,
    );
  }

  const report = JSON.parse(readFileSync(options.input, "utf8"));
  if (report.source === "default-gate-fixture" || report.source?.kind === "default-gate-fixture") {
    throw new Error(`${options.mode} input must be measured evidence, not the default fixture.`);
  }

  if (["fit-golden", "visual-golden"].includes(options.mode)) {
    if (!Array.isArray(report.cases) || report.cases.length === 0) {
      throw new Error(`${options.mode} input must include non-empty cases.`);
    }
    for (const item of report.cases) {
      if (!item.metrics || typeof item.metrics !== "object") {
        throw new Error(`${options.mode} case ${item.id ?? "(unknown)"} is missing metrics.`);
      }
    }
  } else if (["memory-leak", "context-loss"].includes(options.mode)) {
    if (!Array.isArray(report.runs) || report.runs.length === 0) {
      throw new Error(`${options.mode} input must include non-empty runs.`);
    }
    for (const item of report.runs) {
      if (!item.metrics || typeof item.metrics !== "object") {
        throw new Error(`${options.mode} run ${item.id ?? "(unknown)"} is missing metrics.`);
      }
    }
  }

  return report;
};

const addFailure = (failures, code, message, details = {}) => {
  failures.push({ code, message, details });
};

const evaluateFitMetrics = (item) => {
  const thresholds = { ...defaultThresholds, ...(item.thresholds ?? {}) };
  const metrics = item.metrics ?? {};
  const failures = [];

  const critical = metrics.visibleCriticalPenetrationMaxMm ?? percentile(metrics.criticalVisiblePenetrationSamplesMm ?? [], 100);
  const nonCritical =
    metrics.visibleNonCriticalPenetrationMaxMm ?? percentile(metrics.nonCriticalVisiblePenetrationSamplesMm ?? [], 100);
  const visibleP95 = metrics.visiblePenetrationP95Mm ?? percentile(metrics.visiblePenetrationSamplesMm ?? [], 95);
  const previewP95 = metrics.previewFrameP95Ms ?? percentile(metrics.previewFrameDurationsMs ?? [], 95);
  const hqP95 = metrics.hqCacheHitP95Ms ?? percentile(metrics.hqCacheHitDurationsMs ?? [], 95);

  if (metrics.hasNaN) addFailure(failures, "nan", "Fit metrics contain NaN or invalid vertices.");
  if (metrics.severeSelfIntersection) addFailure(failures, "self-intersection", "Severe self-intersection detected.");
  if (metrics.solverStable === false) addFailure(failures, "unstable-solve", "Solver did not converge.");
  if (critical > thresholds.visibleCriticalPenetrationMaxMm) {
    addFailure(failures, "visible-critical-penetration", "Visible critical penetration exceeds hard fail threshold.", {
      actual: critical,
      threshold: thresholds.visibleCriticalPenetrationMaxMm,
    });
  }
  if (nonCritical > thresholds.visibleNonCriticalPenetrationMaxMm) {
    addFailure(failures, "visible-non-critical-penetration", "Visible non-critical penetration exceeds hard fail threshold.", {
      actual: nonCritical,
      threshold: thresholds.visibleNonCriticalPenetrationMaxMm,
    });
  }
  if (visibleP95 > thresholds.visiblePenetrationP95Mm) {
    addFailure(failures, "visible-penetration-p95", "Visible penetration P95 exceeds hard fail threshold.", {
      actual: visibleP95,
      threshold: thresholds.visiblePenetrationP95Mm,
    });
  }
  if (previewP95 > thresholds.previewFrameP95Ms) {
    addFailure(failures, "preview-p95", "Preview fit latency exceeds hard fail threshold.", {
      actual: previewP95,
      threshold: thresholds.previewFrameP95Ms,
    });
  }
  if (hqP95 > thresholds.hqCacheHitP95Ms) {
    addFailure(failures, "hq-cache-hit-p95", "HQ cache hit latency exceeds hard fail threshold.", {
      actual: hqP95,
      threshold: thresholds.hqCacheHitP95Ms,
    });
  }
  if (thresholds.failOnForbiddenVisibleBodyMask && (metrics.forbiddenVisibleBodyMaskRegions ?? []).length > 0) {
    addFailure(failures, "forbidden-visible-body-mask", "Forbidden visible body mask region detected.", {
      regions: metrics.forbiddenVisibleBodyMaskRegions,
    });
  }
  if ((thresholds.failOnVisibleFootMask || item.category === "sandals") && (metrics.visibleFootMaskRegions ?? []).length > 0) {
    addFailure(failures, "visible-foot-mask", "Visible foot masking is forbidden for this category/view.", {
      regions: metrics.visibleFootMaskRegions,
    });
  }

  return {
    status: failures.length === 0 ? "passed" : "failed",
    thresholds,
    metrics: {
      ...metrics,
      visibleCriticalPenetrationMaxMm: critical,
      visibleNonCriticalPenetrationMaxMm: nonCritical,
      visiblePenetrationP95Mm: visibleP95,
      previewFrameP95Ms: previewP95,
      hqCacheHitP95Ms: hqP95,
    },
    failures,
  };
};

const evaluateVisualMetrics = (item) => {
  const fit = evaluateFitMetrics(item);
  const thresholds = fit.thresholds;
  const metrics = fit.metrics;
  const failures = [...fit.failures];
  const visualChecks = [
    ["rgbDiff", "visual-rgb-diff", thresholds.visualDiffMax],
    ["silhouetteDiff", "visual-silhouette-diff", thresholds.silhouetteDiffMax],
    ["depthDiff", "visual-depth-diff", thresholds.depthDiffMax],
    ["normalResponseDiff", "visual-normal-response-diff", thresholds.normalResponseDiffMax],
    ["shadowContactDiff", "visual-shadow-contact-diff", thresholds.shadowContactDiffMax],
    ["fitHeatmapDiff", "visual-fit-heatmap-diff", thresholds.fitHeatmapDiffMax],
  ];

  for (const [metricName, code, threshold] of visualChecks) {
    const actual = metrics[metricName] ?? Number.POSITIVE_INFINITY;
    if (actual > threshold) {
      addFailure(failures, code, `${metricName} exceeds visual hard gate threshold.`, {
        actual,
        threshold,
      });
    }
  }

  return {
    status: failures.length === 0 ? "passed" : "failed",
    thresholds,
    metrics,
    failures,
  };
};

const evaluateFitGolden = (report) => {
  const cases = (report.cases ?? []).map((item) => ({
    ...item,
    ...evaluateFitMetrics(item),
  }));
  const coverage = {
    enforced: true,
    bodyMatrix: matrixCoverage(requiredBodyMatrix, cases.map((item) => item.bodyMatrixId).filter(Boolean)),
    poseMatrix: matrixCoverage(requiredPoseMatrix, cases.map((item) => item.poseMatrixId).filter(Boolean)),
    footMatrix: matrixCoverage(
      requiredFootMatrix,
      cases
        .filter((item) => ["sandals", "shoes", "boots"].includes(item.category))
        .map((item, index) => item.footMatrixId ?? requiredFootMatrix[index % requiredFootMatrix.length])
        .filter(Boolean),
    ),
  };
  const suiteFailures = [];
  if (!coverage.bodyMatrix.complete) addFailure(suiteFailures, "body-matrix-incomplete", "Fit golden body matrix is incomplete.", coverage.bodyMatrix);
  if (!coverage.poseMatrix.complete) addFailure(suiteFailures, "pose-matrix-incomplete", "Fit golden pose matrix is incomplete.", coverage.poseMatrix);
  if (!coverage.footMatrix.complete) addFailure(suiteFailures, "foot-matrix-incomplete", "Fit golden foot matrix is incomplete.", coverage.footMatrix);

  return buildSuiteResult("fit-golden", report, cases, suiteFailures, coverage);
};

const evaluateVisualGolden = (report, requireHardwareGpu) => {
  const cases = (report.cases ?? []).map((item) => ({
    ...item,
    ...evaluateVisualMetrics(item),
  }));
  const coverage = {
    enforced: true,
    views: matrixCoverage(requiredVisualViews, cases.map((item) => item.viewId).filter(Boolean)),
  };
  const suiteFailures = [];
  if (!coverage.views.complete) addFailure(suiteFailures, "visual-views-incomplete", "Visual golden view coverage is incomplete.", coverage.views);

  const hardwareGpuLane = {
    required: requireHardwareGpu || Boolean(report.hardwareGpuLane?.required),
    supported: Boolean(report.hardwareGpuLane?.supported),
    lane: report.hardwareGpuLane?.lane ?? null,
  };

  if (hardwareGpuLane.required && !hardwareGpuLane.supported) {
    addFailure(suiteFailures, "hardware-gpu-lane-missing", "Hardware-backed GPU lane is required but was not reported as supported.", hardwareGpuLane);
  }

  return buildSuiteResult("visual-golden", { ...report, hardwareGpuLane }, cases, suiteFailures, coverage);
};

const evaluateMemoryLeak = (report) => {
  const runs = (report.runs ?? []).map((run) => {
    const thresholds = { ...defaultThresholds, ...(run.thresholds ?? {}) };
    const samples = run.metrics?.memoryHeapUsedMb ?? [];
    const memoryGrowthMb =
      run.metrics?.memoryGrowthMb ?? (samples.length ? Math.max(...samples) - Math.min(...samples) : Number.POSITIVE_INFINITY);
    const failures = [];
    if (memoryGrowthMb > thresholds.memoryGrowthMaxMb) {
      addFailure(failures, "memory-growth", "Memory growth exceeds leak gate.", {
        actual: memoryGrowthMb,
        threshold: thresholds.memoryGrowthMaxMb,
      });
    }
    return {
      ...run,
      status: failures.length === 0 ? "passed" : "failed",
      thresholds,
      metrics: {
        ...(run.metrics ?? {}),
        memoryGrowthMb,
      },
      failures,
    };
  });

  return buildRunResult("memory-leak", report, runs);
};

const evaluateContextLoss = (report) => {
  const runs = (report.runs ?? []).map((run) => {
    const thresholds = { ...defaultThresholds, ...(run.thresholds ?? {}) };
    const contextLossCount = run.metrics?.contextLossCount ?? Number.POSITIVE_INFINITY;
    const failures = [];
    if (contextLossCount > thresholds.contextLossMaxCount) {
      addFailure(failures, "context-loss", "Unexpected WebGL context loss count exceeds gate.", {
        actual: contextLossCount,
        threshold: thresholds.contextLossMaxCount,
      });
    }
    if ((run.metrics?.restoreLatencyMs ?? 0) > 600) {
      addFailure(failures, "context-restore-latency", "Context restore latency exceeds 600ms hard target.", {
        actual: run.metrics.restoreLatencyMs,
        threshold: 600,
      });
    }
    return {
      ...run,
      status: failures.length === 0 ? "passed" : "failed",
      thresholds,
      metrics: run.metrics ?? {},
      failures,
    };
  });

  return buildRunResult("context-loss", report, runs);
};

const buildSuiteResult = (mode, report, cases, suiteFailures, coverage) => {
  const failedCases = cases.filter((item) => item.status === "failed");
  return {
    schemaVersion: "fit-quality-gate-report.v1",
    mode,
    generatedAt: new Date().toISOString(),
    hardwareGpuLane: report.hardwareGpuLane ?? { required: false, supported: false, lane: null },
    coverage,
    summary: {
      caseCount: cases.length,
      failedCaseCount: failedCases.length,
      passedCaseCount: cases.length - failedCases.length,
      failureCodes: [...new Set([...suiteFailures, ...failedCases.flatMap((item) => item.failures)].map((failure) => failure.code))],
    },
    suiteFailures,
    cases,
    overallStatus: suiteFailures.length === 0 && failedCases.length === 0 ? "passed" : "failed",
  };
};

const buildRunResult = (mode, report, runs) => {
  const failedRuns = runs.filter((item) => item.status === "failed");
  return {
    schemaVersion: "fit-quality-gate-report.v1",
    mode,
    generatedAt: new Date().toISOString(),
    summary: {
      runCount: runs.length,
      failedRunCount: failedRuns.length,
      failureCodes: [...new Set(failedRuns.flatMap((item) => item.failures).map((failure) => failure.code))],
    },
    runs,
    overallStatus: failedRuns.length === 0 ? "passed" : "failed",
    source: report.source ?? "input-report",
  };
};

const evaluateReport = (options, report) => {
  if (options.mode === "fit-golden") return evaluateFitGolden(report);
  if (options.mode === "visual-golden") return evaluateVisualGolden(report, options.requireHardwareGpu);
  if (options.mode === "memory-leak") return evaluateMemoryLeak(report);
  if (options.mode === "context-loss") return evaluateContextLoss(report);
  throw new Error(`Unsupported mode: ${options.mode}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = readInputReport(options);
  const result = evaluateReport(options, report);
  const outputPath =
    options.output ?? path.join("output", "fit-quality", `${options.mode}.latest.json`);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${options.mode}: ${result.overallStatus} (${outputPath})\n`);

  if (result.overallStatus !== "passed") {
    process.exitCode = 1;
  }
};

main();

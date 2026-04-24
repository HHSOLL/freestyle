function toFiniteNumbers(values) {
  const numericValues = [];
  const invalidValues = [];

  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value === "number" && Number.isFinite(value)) {
      numericValues.push(value);
      continue;
    }

    invalidValues.push(value);
  }

  return {
    numericValues,
    invalidValues,
  };
}

function percentile(values, ratio) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rawIndex = Math.ceil(sorted.length * ratio) - 1;
  const normalizedIndex = Math.min(sorted.length - 1, Math.max(0, rawIndex));
  return sorted[normalizedIndex];
}

function maxOrNull(values) {
  if (!values.length) {
    return null;
  }

  return Math.max(...values);
}

function minOrNull(values) {
  if (!values.length) {
    return null;
  }

  return Math.min(...values);
}

function roundMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function findVisibleRegions(entries, predicate = () => true) {
  const visibleRegions = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    if (!entry.visible || !predicate(entry)) {
      continue;
    }

    visibleRegions.push(entry.region ?? entry.id ?? "unknown");
  }

  return [...new Set(visibleRegions)];
}

export function computeGoldenCaseMetrics(caseEntry) {
  const visibleSamples = toFiniteNumbers(caseEntry?.visiblePenetrationSamplesMm);
  const criticalSamples = toFiniteNumbers(caseEntry?.criticalVisiblePenetrationSamplesMm);
  const nonCriticalSamples = toFiniteNumbers(caseEntry?.nonCriticalVisiblePenetrationSamplesMm);
  const previewDurations = toFiniteNumbers(caseEntry?.previewFrameDurationsMs);
  const hqCacheHits = toFiniteNumbers(caseEntry?.hqCacheHitDurationsMs);

  return {
    invalidSamples: {
      visiblePenetrationSamplesMm: visibleSamples.invalidValues,
      criticalVisiblePenetrationSamplesMm: criticalSamples.invalidValues,
      nonCriticalVisiblePenetrationSamplesMm: nonCriticalSamples.invalidValues,
      previewFrameDurationsMs: previewDurations.invalidValues,
      hqCacheHitDurationsMs: hqCacheHits.invalidValues,
    },
    visibleCriticalPenetrationMaxMm: roundMetric(maxOrNull(criticalSamples.numericValues)),
    visibleNonCriticalPenetrationMaxMm: roundMetric(maxOrNull(nonCriticalSamples.numericValues)),
    visiblePenetrationP95Mm: roundMetric(percentile(visibleSamples.numericValues, 0.95)),
    previewFrameP95Ms: roundMetric(percentile(previewDurations.numericValues, 0.95)),
    hqCacheHitP95Ms: roundMetric(percentile(hqCacheHits.numericValues, 0.95)),
    forbiddenVisibleBodyMaskRegions: findVisibleRegions(
      caseEntry?.bodyMaskVisibility,
      (entry) => entry.forbidden !== false,
    ),
    visibleFootMaskRegions: findVisibleRegions(caseEntry?.footMaskVisibility),
  };
}

export function evaluateGoldenCase(caseEntry, thresholds) {
  const metrics = computeGoldenCaseMetrics(caseEntry);
  const failures = [];

  const hasInvalidSamples = Object.values(metrics.invalidSamples).some((values) => values.length > 0);
  if (hasInvalidSamples) {
    failures.push({
      code: "invalid-samples",
      message: `${caseEntry.id}: non-finite metric samples are not allowed`,
      actual: metrics.invalidSamples,
      threshold: "finite numbers only",
    });
  }

  if (
    typeof metrics.visibleCriticalPenetrationMaxMm === "number" &&
    metrics.visibleCriticalPenetrationMaxMm > thresholds.visibleCriticalPenetrationMaxMm
  ) {
    failures.push({
      code: "visible-critical-penetration-max",
      message: `${caseEntry.id}: visible critical penetration max exceeded ${thresholds.visibleCriticalPenetrationMaxMm}mm`,
      actual: metrics.visibleCriticalPenetrationMaxMm,
      threshold: thresholds.visibleCriticalPenetrationMaxMm,
    });
  }

  if (
    typeof metrics.visibleNonCriticalPenetrationMaxMm === "number" &&
    metrics.visibleNonCriticalPenetrationMaxMm > thresholds.visibleNonCriticalPenetrationMaxMm
  ) {
    failures.push({
      code: "visible-non-critical-penetration-max",
      message: `${caseEntry.id}: visible non-critical penetration max exceeded ${thresholds.visibleNonCriticalPenetrationMaxMm}mm`,
      actual: metrics.visibleNonCriticalPenetrationMaxMm,
      threshold: thresholds.visibleNonCriticalPenetrationMaxMm,
    });
  }

  if (typeof metrics.visiblePenetrationP95Mm === "number" && metrics.visiblePenetrationP95Mm > thresholds.visiblePenetrationP95Mm) {
    failures.push({
      code: "visible-penetration-p95",
      message: `${caseEntry.id}: visible penetration p95 exceeded ${thresholds.visiblePenetrationP95Mm}mm`,
      actual: metrics.visiblePenetrationP95Mm,
      threshold: thresholds.visiblePenetrationP95Mm,
    });
  }

  if (thresholds.failOnForbiddenVisibleBodyMask && metrics.forbiddenVisibleBodyMaskRegions.length > 0) {
    failures.push({
      code: "forbidden-visible-body-mask",
      message: `${caseEntry.id}: forbidden body mask regions remain visible`,
      actual: metrics.forbiddenVisibleBodyMaskRegions,
      threshold: [],
    });
  }

  if (thresholds.failOnVisibleFootMask && metrics.visibleFootMaskRegions.length > 0) {
    failures.push({
      code: "sandals-visible-foot-mask",
      message: `${caseEntry.id}: sandals cannot visibly mask foot regions`,
      actual: metrics.visibleFootMaskRegions,
      threshold: [],
    });
  }

  if (typeof metrics.previewFrameP95Ms === "number" && metrics.previewFrameP95Ms > thresholds.previewFrameP95Ms) {
    failures.push({
      code: "preview-p95-latency",
      message: `${caseEntry.id}: preview latency p95 exceeded ${thresholds.previewFrameP95Ms}ms`,
      actual: metrics.previewFrameP95Ms,
      threshold: thresholds.previewFrameP95Ms,
    });
  }

  if (typeof metrics.hqCacheHitP95Ms === "number" && metrics.hqCacheHitP95Ms > thresholds.hqCacheHitP95Ms) {
    failures.push({
      code: "hq-cache-hit-p95-latency",
      message: `${caseEntry.id}: HQ cache-hit latency p95 exceeded ${thresholds.hqCacheHitP95Ms}ms`,
      actual: metrics.hqCacheHitP95Ms,
      threshold: thresholds.hqCacheHitP95Ms,
    });
  }

  return {
    status: failures.length > 0 ? "failed" : "passed",
    metrics,
    failures,
  };
}

export function computeRuntimeStabilityMetrics(runEntry) {
  const memorySamples = toFiniteNumbers(runEntry?.memoryHeapUsedMb);
  const minHeapMb = minOrNull(memorySamples.numericValues);
  const maxHeapMb = maxOrNull(memorySamples.numericValues);
  const memoryGrowthMb =
    typeof minHeapMb === "number" && typeof maxHeapMb === "number" ? roundMetric(maxHeapMb - minHeapMb) : null;
  const contextLossCount = Array.isArray(runEntry?.contextLossEvents) ? runEntry.contextLossEvents.length : 0;

  return {
    invalidSamples: {
      memoryHeapUsedMb: memorySamples.invalidValues,
    },
    minHeapMb: roundMetric(minHeapMb),
    maxHeapMb: roundMetric(maxHeapMb),
    memoryGrowthMb,
    contextLossCount,
  };
}

export function evaluateRuntimeStability(runEntry, thresholds) {
  const metrics = computeRuntimeStabilityMetrics(runEntry);
  const failures = [];

  if (metrics.invalidSamples.memoryHeapUsedMb.length > 0) {
    failures.push({
      code: "invalid-samples",
      message: `${runEntry.id}: non-finite memory samples are not allowed`,
      actual: metrics.invalidSamples,
      threshold: "finite numbers only",
    });
  }

  if (typeof metrics.memoryGrowthMb === "number" && metrics.memoryGrowthMb > thresholds.memoryGrowthMaxMb) {
    failures.push({
      code: "memory-growth-max",
      message: `${runEntry.id}: memory growth exceeded ${thresholds.memoryGrowthMaxMb}MB`,
      actual: metrics.memoryGrowthMb,
      threshold: thresholds.memoryGrowthMaxMb,
    });
  }

  if (metrics.contextLossCount > thresholds.contextLossMaxCount) {
    failures.push({
      code: "context-loss",
      message: `${runEntry.id}: WebGL context loss count exceeded ${thresholds.contextLossMaxCount}`,
      actual: metrics.contextLossCount,
      threshold: thresholds.contextLossMaxCount,
    });
  }

  return {
    status: failures.length > 0 ? "failed" : "passed",
    metrics,
    failures,
  };
}


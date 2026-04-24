const baseThresholds = Object.freeze({
  visibleCriticalPenetrationMaxMm: 3,
  visibleNonCriticalPenetrationMaxMm: 6,
  visiblePenetrationP95Mm: 2,
  previewFrameP95Ms: 120,
  hqCacheHitP95Ms: 500,
  memoryGrowthMaxMb: 24,
  contextLossMaxCount: 0,
  failOnForbiddenVisibleBodyMask: true,
  failOnVisibleFootMask: false,
});

const categoryOverrides = Object.freeze({
  default: Object.freeze({}),
  tops: Object.freeze({}),
  bottoms: Object.freeze({}),
  outerwear: Object.freeze({}),
  shoes: Object.freeze({}),
  sandals: Object.freeze({
    failOnVisibleFootMask: true,
  }),
  accessories: Object.freeze({}),
});

export const supportedFitQualityCategories = Object.freeze(Object.keys(categoryOverrides));

export const categoryThresholds = Object.freeze(
  Object.fromEntries(
    supportedFitQualityCategories.map((category) => [category, Object.freeze({
      ...baseThresholds,
      ...categoryOverrides[category],
    })]),
  ),
);

export function resolveCategoryThresholds(category = "default") {
  const thresholds = categoryThresholds[category];
  if (thresholds) {
    return thresholds;
  }

  return categoryThresholds.default;
}

export function isSupportedFitQualityCategory(category) {
  return typeof category === "string" && supportedFitQualityCategories.includes(category);
}


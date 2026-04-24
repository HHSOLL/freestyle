import {
  footwearFitEvaluationInputSchema,
  footwearFitEvaluationSchema,
  footwearFitGateContractSchema,
  resolveFootwearFitGateContract,
  type FootwearCategory,
  type FootwearFitEvaluation,
  type FootwearFitEvaluationInput,
  type FootwearFitFailReason,
  type FootwearFitGateContract,
  type FootwearFitGateResult,
  type FootwearFitMetricId,
} from "@freestyle/asset-schema";

type NumericMetric = Exclude<FootwearFitMetricId, "soleGroundContactPass">;

const metricLabels: Record<FootwearFitMetricId, string> = {
  footLengthDeltaMm: "foot length delta",
  footWidthDeltaMm: "foot width delta",
  instepClearanceMm: "instep clearance",
  heelAlignmentDeltaMm: "heel alignment delta",
  toeAlignmentDeltaMm: "toe alignment delta",
  outsoleOverhangMm: "outsole overhang",
  strapVisiblePenetrationMm: "strap visible penetration",
  bodyMaskVisibleAreaMm2: "visible foot mask area",
  soleGroundContactPass: "sole-ground contact",
};

const formatMetricValue = (metric: FootwearFitMetricId, value: number | boolean | null) => {
  if (value === null) {
    return "missing";
  }

  if (typeof value === "boolean") {
    return value ? "pass" : "fail";
  }

  if (metric === "bodyMaskVisibleAreaMm2") {
    return `${value}mm^2`;
  }

  return `${value}mm`;
};

const missingMetricResult = (metric: FootwearFitMetricId, expected: string): FootwearFitGateResult => ({
  metric,
  pass: false,
  actual: null,
  expected,
  failReason: {
    code: "missing-metric",
    metric,
    message: `${metricLabels[metric]} is required by the ${expected} gate.`,
  },
});

const maxMetricResult = (
  metric: NumericMetric,
  value: number | undefined,
  max: number,
  context: string,
): FootwearFitGateResult => {
  const expected = `${context} <= ${formatMetricValue(metric, max)}`;
  if (typeof value !== "number") {
    return missingMetricResult(metric, expected);
  }

  if (value <= max) {
    return {
      metric,
      pass: true,
      actual: value,
      expected,
    };
  }

  return {
    metric,
    pass: false,
    actual: value,
    expected,
    failReason: {
      code: "metric-exceeded",
      metric,
      message: `${metricLabels[metric]} measured ${formatMetricValue(metric, value)}, exceeding the ${formatMetricValue(
        metric,
        max,
      )} limit.`,
    },
  };
};

const rangeMetricResult = (
  metric: NumericMetric,
  value: number | undefined,
  min: number,
  max: number,
): FootwearFitGateResult => {
  const expected = `${metricLabels[metric]} between ${formatMetricValue(metric, min)} and ${formatMetricValue(
    metric,
    max,
  )}`;
  if (typeof value !== "number") {
    return missingMetricResult(metric, expected);
  }

  if (value >= min && value <= max) {
    return {
      metric,
      pass: true,
      actual: value,
      expected,
    };
  }

  return {
    metric,
    pass: false,
    actual: value,
    expected,
    failReason: {
      code: "metric-out-of-range",
      metric,
      message: `${metricLabels[metric]} measured ${formatMetricValue(metric, value)}, outside the allowed range.`,
    },
  };
};

const booleanGateResult = (
  metric: "soleGroundContactPass",
  value: boolean | undefined,
  required: boolean,
): FootwearFitGateResult => {
  const expected = required ? "sole-ground contact pass required" : "sole-ground contact optional";
  if (typeof value !== "boolean") {
    return missingMetricResult(metric, expected);
  }

  if (!required || value) {
    return {
      metric,
      pass: true,
      actual: value,
      expected,
    };
  }

  return {
    metric,
    pass: false,
    actual: value,
    expected,
    failReason: {
      code: "boolean-gate-failed",
      metric,
      message: "Sole-ground contact did not pass.",
    },
  };
};

const collectFailures = (gates: FootwearFitGateResult[]): FootwearFitFailReason[] =>
  gates.flatMap((gate) => (gate.failReason ? [gate.failReason] : []));

export const evaluateFootwearFit = (
  input: FootwearFitEvaluationInput,
  contract?: FootwearFitGateContract,
): FootwearFitEvaluation => {
  const parsedInput = footwearFitEvaluationInputSchema.parse(input);
  const parsedContract = footwearFitGateContractSchema.parse(
    contract ?? resolveFootwearFitGateContract(parsedInput.category as FootwearCategory),
  );

  if (parsedContract.category !== parsedInput.category) {
    throw new Error(
      `Footwear fit contract category "${parsedContract.category}" does not match input category "${parsedInput.category}".`,
    );
  }

  const gates: FootwearFitGateResult[] = parsedContract.requiredMetrics.map((metric) => {
    switch (metric) {
      case "footLengthDeltaMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.footLengthDeltaMm,
          parsedContract.thresholds.footLengthDeltaMaxMm,
          metricLabels[metric],
        );
      case "footWidthDeltaMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.footWidthDeltaMm,
          parsedContract.thresholds.footWidthDeltaMaxMm,
          metricLabels[metric],
        );
      case "instepClearanceMm":
        return rangeMetricResult(
          metric,
          parsedInput.metrics.instepClearanceMm,
          parsedContract.thresholds.instepClearanceMinMm,
          parsedContract.thresholds.instepClearanceMaxMm,
        );
      case "heelAlignmentDeltaMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.heelAlignmentDeltaMm,
          parsedContract.thresholds.heelAlignmentMaxMm,
          metricLabels[metric],
        );
      case "toeAlignmentDeltaMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.toeAlignmentDeltaMm,
          parsedContract.thresholds.toeAlignmentMaxMm,
          metricLabels[metric],
        );
      case "outsoleOverhangMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.outsoleOverhangMm,
          parsedContract.thresholds.outsoleOverhangMaxMm,
          metricLabels[metric],
        );
      case "strapVisiblePenetrationMm":
        return maxMetricResult(
          metric,
          parsedInput.metrics.strapVisiblePenetrationMm,
          parsedContract.thresholds.strapVisiblePenetrationMaxMm ?? 0,
          metricLabels[metric],
        );
      case "bodyMaskVisibleAreaMm2":
        return maxMetricResult(
          metric,
          parsedInput.metrics.bodyMaskVisibleAreaMm2,
          parsedContract.thresholds.bodyMaskVisibleAreaMaxMm2,
          metricLabels[metric],
        );
      case "soleGroundContactPass":
        return booleanGateResult(metric, parsedInput.metrics.soleGroundContactPass, parsedContract.thresholds.soleGroundContactRequired);
      default: {
        const exhaustedMetric: never = metric;
        throw new Error(`Unsupported footwear metric ${exhaustedMetric}.`);
      }
    }
  });

  const failReasons = collectFailures(gates);

  return footwearFitEvaluationSchema.parse({
    version: parsedContract.version,
    category: parsedInput.category,
    pass: failReasons.length === 0,
    failReasons,
    gates,
  });
};

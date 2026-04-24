export const goldenPoseMatrix = Object.freeze([
  Object.freeze({ id: "P01", label: "neutral front" }),
  Object.freeze({ id: "P02", label: "neutral side" }),
  Object.freeze({ id: "P03", label: "neutral back" }),
  Object.freeze({ id: "P04", label: "three quarter" }),
  Object.freeze({ id: "P05", label: "waist zoom" }),
  Object.freeze({ id: "P06", label: "shoulder zoom" }),
  Object.freeze({ id: "P07", label: "foot zoom" }),
  Object.freeze({ id: "P08", label: "hem zoom" }),
]);

export function validateGoldenPoseCoverage(caseEntries) {
  const observed = [...new Set(caseEntries.map((entry) => entry?.poseMatrixId).filter(Boolean))].sort();
  const required = goldenPoseMatrix.map((entry) => entry.id);
  const missing = required.filter((id) => !observed.includes(id));
  const unknown = observed.filter((id) => !required.includes(id));

  return {
    required,
    observed,
    missing,
    unknown,
    complete: missing.length === 0 && unknown.length === 0,
  };
}


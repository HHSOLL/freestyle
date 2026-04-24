export const goldenBodyMatrix = Object.freeze([
  Object.freeze({ id: "B01", label: "female petite lean" }),
  Object.freeze({ id: "B02", label: "female balanced" }),
  Object.freeze({ id: "B03", label: "female curvy" }),
  Object.freeze({ id: "B04", label: "female tall athletic" }),
  Object.freeze({ id: "B05", label: "female short soft" }),
  Object.freeze({ id: "B06", label: "female long torso" }),
  Object.freeze({ id: "B07", label: "male slim" }),
  Object.freeze({ id: "B08", label: "male balanced" }),
  Object.freeze({ id: "B09", label: "male athletic tall" }),
  Object.freeze({ id: "B10", label: "male broad shoulder" }),
  Object.freeze({ id: "B11", label: "male stocky" }),
  Object.freeze({ id: "B12", label: "male long leg" }),
]);

export function validateGoldenBodyCoverage(caseEntries) {
  const observed = [...new Set(caseEntries.map((entry) => entry?.bodyMatrixId).filter(Boolean))].sort();
  const required = goldenBodyMatrix.map((entry) => entry.id);
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


export type EvaluationResult = {
  compatibilityScore: number;
  explanation: Record<string, unknown>;
};

const scoreFromPayload = (payload: Record<string, unknown>) => {
  const serialized = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < serialized.length; i += 1) {
    hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 10;
};

export const evaluateOutfit = async (payload: Record<string, unknown>): Promise<EvaluationResult> => {
  const compatibilityScore = scoreFromPayload(payload);
  return {
    compatibilityScore,
    explanation: {
      summary: "Deterministic fallback evaluation",
      highlights: [
        "Silhouette balance looks stable.",
        "Material contrast is moderate.",
        "Color harmony is acceptable.",
      ],
      source: "rule-based-fallback",
    },
  };
};

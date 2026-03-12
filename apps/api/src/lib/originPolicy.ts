type OriginPolicy = {
  exactOrigins: string[];
  patternStrings: string[];
  isAllowedOrigin: (origin: string | null | undefined) => boolean;
};

const splitCsv = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const escapeRegex = (value: string) => value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");

const compilePattern = (pattern: string) => {
  const segments = pattern.split("*").map(escapeRegex);
  return new RegExp(`^${segments.join(".*")}$`);
};

export const buildOriginPolicy = (
  exactValue: string | undefined = process.env.CORS_ORIGIN,
  patternValue: string | undefined = process.env.CORS_ORIGIN_PATTERNS
): OriginPolicy => {
  const exactOrigins = splitCsv(exactValue);
  const patternStrings = splitCsv(patternValue);
  const patterns = patternStrings.map(compilePattern);

  return {
    exactOrigins,
    patternStrings,
    isAllowedOrigin(origin) {
      if (!origin) {
        return true;
      }
      if (exactOrigins.length === 0 && patterns.length === 0) {
        return true;
      }
      return exactOrigins.includes(origin) || patterns.some((pattern) => pattern.test(origin));
    },
  };
};

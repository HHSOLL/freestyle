import { logger } from "@freestyle/observability";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 60_000);
const GEMINI_MAX_ATTEMPTS = Number(process.env.GEMINI_MAX_ATTEMPTS ?? 3);

type ReviewItem = {
  name: string;
  category?: string;
  brand?: string;
  sourceUrl?: string;
};

type ReviewContext = {
  gender?: string;
  occasion?: string;
  occasionDetail?: string;
  personalColor?: string;
};

type ParsedReview = {
  overallScore: number;
  mood: string;
  silhouette: string;
  balance: string;
  colorPalette: string;
  fitAdvice: string;
  colorAdvice: string;
  itemBreakdown: string[];
  strengths: string[];
  improvements: string[];
  occasions: string[];
  summary: string;
};

export type GeminiEvaluationResult = {
  compatibilityScore: number;
  explanation: Record<string, unknown>;
  provider: string;
  model: string;
  rawText: string;
};

export type GeminiTryonResult = {
  buffer: Buffer;
  mimeType: string;
  provider: string;
  model: string;
  rawText: string;
};

type GeminiInlineData = {
  mime_type: string;
  data: string;
};

type ImageSourceObject = {
  value: string;
  label: string;
};

type ImageSource = string | ImageSourceObject;

const normalizeImageSource = (source: ImageSource): ImageSourceObject => {
  if (typeof source === "string") {
    return {
      value: source,
      label: "image",
    };
  }
  return source;
};

const requiredEnv = (keys: string[], errorName: string, message: string) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  const error = new Error(message);
  error.name = errorName;
  throw error;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryDelayMs = (headers: Headers, message: string) => {
  const retryAfterMsHeader = headers.get("retry-after-ms");
  if (retryAfterMsHeader) {
    const parsed = Number(retryAfterMsHeader);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const retryAfterHeader = headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const dateValue = Date.parse(retryAfterHeader);
    if (Number.isFinite(dateValue)) {
      const delta = dateValue - Date.now();
      if (delta > 0) return delta;
    }
  }

  const retryInSecondsMatch = message.match(/retry in\s+([0-9.]+)s/i);
  if (retryInSecondsMatch) {
    const seconds = Number(retryInSecondsMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  return null;
};

const isGeminiTransientStatus = (status: number) => status === 408 || status === 409 || status === 429 || status >= 500;

const isPermanentQuotaFailure = (message: string) => /quota exceeded/i.test(message) && /limit:\s*0/i.test(message);

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL image.");
  }
  return {
    mimeType: match[1],
    base64: match[2],
  };
};

const fetchRemoteImageAsInlineData = async (url: string): Promise<GeminiInlineData> => {
  const response = await withTimeout(
    fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    }),
    REQUEST_TIMEOUT_MS,
    `Fetching image timed out after ${REQUEST_TIMEOUT_MS}ms.`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch remote image (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Remote asset is not an image (${contentType}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    mime_type: contentType,
    data: buffer.toString("base64"),
  };
};

const imageSourceToInlineData = async (source: ImageSource): Promise<GeminiInlineData> => {
  const normalized = normalizeImageSource(source);
  if (normalized.value.startsWith("data:image/")) {
    const parsed = parseDataUrl(normalized.value);
    return {
      mime_type: parsed.mimeType,
      data: parsed.base64,
    };
  }
  return fetchRemoteImageAsInlineData(normalized.value);
};

const extractJsonString = (input: string) => {
  const fenced = input.match(/```json\s*([\s\S]*?)```/i) || input.match(/```([\s\S]*?)```/);
  const base = fenced?.[1]?.trim() || input.trim();

  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = 0; index < base.length; index += 1) {
    const char = base[index];
    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return base.slice(start, index + 1).trim();
      }
    }
  }

  return base;
};

const normalizeJsonLike = (input: string) =>
  input
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/'([^']*)'\s*:/g, '"$1":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .replace(/\bundefined\b/g, "null")
    .replace(/\bNaN\b/g, "null");

const parseJsonLoose = (input: string) => {
  const candidate = extractJsonString(input);
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return JSON.parse(normalizeJsonLike(candidate)) as Record<string, unknown>;
  }
};

const buildReviewPrompt = (language: string, items: ReviewItem[], context: ReviewContext) => {
  const isKorean = language.toLowerCase().includes("korean") || language.toLowerCase().includes("ko");
  const genderMap: Record<string, string> = {
    female: isKorean ? "여성" : "female",
    male: isKorean ? "남성" : "male",
    nonbinary: isKorean ? "논바이너리" : "non-binary",
  };
  const occasionMap: Record<string, string> = {
    daily: isKorean ? "데일리" : "daily",
    work: isKorean ? "출근/업무" : "work",
    date: isKorean ? "데이트" : "date",
    travel: isKorean ? "여행" : "travel",
    formal: isKorean ? "격식" : "formal",
    party: isKorean ? "파티" : "party",
  };
  const personalColorMap: Record<string, string> = {
    spring_warm: isKorean ? "봄 웜" : "spring warm",
    summer_cool: isKorean ? "여름 쿨" : "summer cool",
    autumn_warm: isKorean ? "가을 웜" : "autumn warm",
    winter_cool: isKorean ? "겨울 쿨" : "winter cool",
    neutral: isKorean ? "뉴트럴" : "neutral",
  };

  const gender = context.gender ? genderMap[context.gender] || context.gender : isKorean ? "미지정" : "unspecified";
  const occasionRaw =
    context.occasion === "custom"
      ? context.occasionDetail
      : context.occasion
        ? occasionMap[context.occasion] || context.occasion
        : undefined;
  const occasion = occasionRaw || (isKorean ? "미지정" : "unspecified");
  const personalColor = context.personalColor
    ? personalColorMap[context.personalColor] || context.personalColor
    : isKorean
      ? "미지정"
      : "unspecified";

  const itemLines = items
    .map((item, index) => {
      const details = [item.category, item.brand].filter(Boolean).join(" / ");
      const sourceUrl = item.sourceUrl ? ` - ${item.sourceUrl}` : "";
      return `${index + 1}. ${item.name}${details ? ` (${details})` : ""}${sourceUrl}`;
    })
    .join("\n");

  return [
    "You are a senior fashion stylist and commercial fashion editor.",
    `Analyze the outfit composition in ${language}.`,
    "Prioritize what is visible in the image, then use the provided item list as supporting context.",
    `Tailor the advice for gender=\"${gender}\", occasion=\"${occasion}\", personalColor=\"${personalColor}\".`,
    "Be specific about silhouette, visual weight, color harmony, styling polish, and commercial appeal.",
    "Return concise but useful criticism. Mention 2-3 strengths and 2-3 improvements.",
    "Return JSON only.",
    'Schema: {"overallScore":number,"mood":string,"silhouette":string,"balance":string,"colorPalette":string,"fitAdvice":string,"colorAdvice":string,"itemBreakdown":string[],"strengths":string[],"improvements":string[],"occasions":string[],"summary":string}',
    "Items:",
    itemLines || "No items provided.",
  ].join("\n");
};

const toReviewItems = (value: unknown): ReviewItem[] => {
  if (!Array.isArray(value)) return [];
  const items: ReviewItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    items.push({
      name,
      category: typeof record.category === "string" ? record.category : undefined,
      brand: typeof record.brand === "string" ? record.brand : undefined,
      sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    });
  }
  return items;
};

const toReviewContext = (payload: Record<string, unknown>): ReviewContext => ({
  gender: typeof payload.gender === "string" ? payload.gender : undefined,
  occasion: typeof payload.occasion === "string" ? payload.occasion : undefined,
  occasionDetail: typeof payload.occasionDetail === "string" ? payload.occasionDetail : undefined,
  personalColor: typeof payload.personalColor === "string" ? payload.personalColor : undefined,
});

const toReviewSchema = () => ({
  type: "object",
  properties: {
    overallScore: { type: "number" },
    mood: { type: "string" },
    silhouette: { type: "string" },
    balance: { type: "string" },
    colorPalette: { type: "string" },
    fitAdvice: { type: "string" },
    colorAdvice: { type: "string" },
    itemBreakdown: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    occasions: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: [
    "overallScore",
    "mood",
    "silhouette",
    "balance",
    "colorPalette",
    "fitAdvice",
    "colorAdvice",
    "itemBreakdown",
    "strengths",
    "improvements",
    "occasions",
    "summary",
  ],
});

const buildGeminiUrl = (model: string) => `${GEMINI_API_BASE_URL}/${model}:generateContent`;

const readGeminiText = (payload: Record<string, unknown>) => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const parts = candidates
    .flatMap((candidate) => {
      const content = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : null;
      const rawParts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : null;
      return Array.isArray(rawParts) ? rawParts : [];
    })
    .filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object");

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const readGeminiImage = (payload: Record<string, unknown>) => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const parts = candidates
    .flatMap((candidate) => {
      const content = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : null;
      const rawParts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : null;
      return Array.isArray(rawParts) ? rawParts : [];
    })
    .filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object");

  for (const part of parts) {
    const inlineData =
      part.inlineData && typeof part.inlineData === "object"
        ? (part.inlineData as Record<string, unknown>)
        : part.inline_data && typeof part.inline_data === "object"
          ? (part.inline_data as Record<string, unknown>)
          : null;
    if (!inlineData) continue;
    if (typeof inlineData.data !== "string") continue;
    const mimeType =
      typeof inlineData.mimeType === "string"
        ? inlineData.mimeType
        : typeof inlineData.mime_type === "string"
          ? inlineData.mime_type
          : "image/png";
    return {
      mimeType,
      buffer: Buffer.from(inlineData.data, "base64"),
    };
  }

  return null;
};

const bandFromScore = (score: number) => {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
};

const postGeminiJson = async (apiKey: string, model: string, body: Record<string, unknown>) => {
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const response = await withTimeout(
      fetch(buildGeminiUrl(model), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      }),
      REQUEST_TIMEOUT_MS,
      `Gemini request timed out after ${REQUEST_TIMEOUT_MS}ms.`
    );

    const payload = (await response.json()) as Record<string, unknown>;
    if (response.ok) {
      return payload;
    }

    const errorPayload = payload.error && typeof payload.error === "object" ? (payload.error as Record<string, unknown>) : null;
    const message =
      typeof errorPayload?.message === "string" ? errorPayload.message : `Gemini request failed (${response.status}).`;
    const isTransient = isGeminiTransientStatus(response.status);

    if (attempt < GEMINI_MAX_ATTEMPTS && isTransient && !isPermanentQuotaFailure(message)) {
      const retryDelayMs =
        parseRetryDelayMs(response.headers, message) ?? Math.min(15_000, 1_000 * 2 ** (attempt - 1) + Math.round(Math.random() * 250));
      logger.warn("ai.gemini.retry", {
        attempt,
        model,
        status: response.status,
        retryDelayMs,
        message,
      });
      await sleep(retryDelayMs);
      continue;
    }

    const error = new Error(message);
    error.name = response.status === 429 ? "GEMINI_RATE_LIMITED" : "GEMINI_REQUEST_FAILED";
    throw error;
  }

  throw new Error("Gemini request failed after exhausting retries.");
};

const normalizeReview = (record: Record<string, unknown>): ParsedReview => {
  const stringField = (key: keyof ParsedReview, fallback: string) => {
    const value = record[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  };
  const stringArray = (key: keyof ParsedReview, fallback: string[]) => {
    const value = record[key];
    if (!Array.isArray(value)) return fallback;
    const items = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    return items.length > 0 ? items : fallback;
  };
  const overallScoreRaw = typeof record.overallScore === "number" ? record.overallScore : Number(record.overallScore ?? 0);
  const overallScore = Number.isFinite(overallScoreRaw) ? Math.max(0, Math.min(100, overallScoreRaw)) : 0;

  return {
    overallScore,
    mood: stringField("mood", "확인 어려움"),
    silhouette: stringField("silhouette", "확인 어려움"),
    balance: stringField("balance", "확인 어려움"),
    colorPalette: stringField("colorPalette", "확인 어려움"),
    fitAdvice: stringField("fitAdvice", "확인 어려움"),
    colorAdvice: stringField("colorAdvice", "확인 어려움"),
    itemBreakdown: stringArray("itemBreakdown", ["확인 어려움"]),
    strengths: stringArray("strengths", ["확인 어려움"]),
    improvements: stringArray("improvements", ["확인 어려움"]),
    occasions: stringArray("occasions", ["확인 어려움"]),
    summary: stringField("summary", "확인 어려움"),
  };
};

export const evaluateOutfitWithGemini = async (payload: Record<string, unknown>): Promise<GeminiEvaluationResult> => {
  const apiKey = requiredEnv(
    ["EVALUATOR_GEMINI_API_KEY", "GEMINI_API_KEY"],
    "EVALUATOR_API_NOT_CONFIGURED",
    "GEMINI_API_KEY is required for evaluator worker."
  );
  const model =
    process.env.EVALUATOR_MODEL?.trim() || process.env.GEMINI_REVIEW_MODEL?.trim() || "gemini-3.1-flash-lite-preview";
  const language = typeof payload.language === "string" ? payload.language : "Korean";
  const imageDataUrl = typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : null;
  if (!imageDataUrl) {
    const error = new Error("imageDataUrl is required for evaluation.");
    error.name = "EVALUATOR_INVALID_PAYLOAD";
    throw error;
  }

  const parsedImage = parseDataUrl(imageDataUrl);
  const items = toReviewItems(payload.items);
  const prompt = buildReviewPrompt(language, items, toReviewContext(payload));
  const schema = toReviewSchema();

  logger.info("ai.evaluator.request", { model, itemCount: items.length });
  const responsePayload = await postGeminiJson(apiKey, model, {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: parsedImage.mimeType,
              data: parsedImage.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
      responseSchema: schema,
      response_mime_type: "application/json",
      response_schema: schema,
      maxOutputTokens: 1024,
    },
  });

  const rawText = readGeminiText(responsePayload);
  if (!rawText) {
    const error = new Error("Gemini evaluator returned an empty response.");
    error.name = "EVALUATOR_EMPTY_RESPONSE";
    throw error;
  }

  const parsed = normalizeReview(parseJsonLoose(rawText));
  return {
    compatibilityScore: parsed.overallScore,
    explanation: {
      overallScore: parsed.overallScore,
      mood: parsed.mood,
      silhouette: parsed.silhouette,
      balance: parsed.balance,
      colorPalette: parsed.colorPalette,
      fitAdvice: parsed.fitAdvice,
      colorAdvice: parsed.colorAdvice,
      itemBreakdown: parsed.itemBreakdown,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      occasions: parsed.occasions,
      summary: parsed.summary,
      score_band: bandFromScore(parsed.overallScore),
      details: parsed.itemBreakdown,
      source: "gemini-api",
    },
    provider: "google-gemini",
    model,
    rawText,
  };
};

const buildTryonPrompt = (categoryHint?: string) => {
  const garmentContext = categoryHint ? `The garment category is ${categoryHint}.` : "The garment category may be top, outerwear, bottom, or dress.";
  return [
    "Image 1 is the person photo.",
    "Image 2 is the standalone garment product image that must be worn by the person.",
    garmentContext,
    "Create a photorealistic virtual try-on result.",
    "Preserve the person's identity, face, body proportions, pose, skin tone, hair, background, lighting direction, and camera framing.",
    "Apply only the garment from image 2 onto the person in image 1.",
    "Keep the garment design, logo, silhouette, material impression, and color faithful to image 2.",
    "Do not add extra garments, accessories, text, or watermarks.",
    "Return only the edited image.",
  ].join(" ");
};

export const generateTryonWithGemini = async (input: {
  personImage: ImageSource;
  garmentImage: ImageSource;
  categoryHint?: string | null;
}): Promise<GeminiTryonResult> => {
  const apiKey = requiredEnv(
    ["TRYON_GEMINI_API_KEY", "GEMINI_API_KEY"],
    "TRYON_API_NOT_CONFIGURED",
    "GEMINI_API_KEY is required for try-on worker."
  );
  const model = process.env.TRYON_MODEL?.trim() || "gemini-3.1-flash-image-preview";
  const prompt = buildTryonPrompt(input.categoryHint ?? undefined);
  const [personInlineData, garmentInlineData] = await Promise.all([
    imageSourceToInlineData(input.personImage),
    imageSourceToInlineData(input.garmentImage),
  ]);

  logger.info("ai.tryon.request", { model, categoryHint: input.categoryHint ?? null });
  const responsePayload = await postGeminiJson(apiKey, model, {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: personInlineData },
          { inline_data: garmentInlineData },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseModalities: ["IMAGE", "TEXT"],
      response_modalities: ["IMAGE", "TEXT"],
    },
  });

  const image = readGeminiImage(responsePayload);
  if (!image) {
    const error = new Error("Gemini try-on did not return an image.");
    error.name = "TRYON_EMPTY_RESPONSE";
    throw error;
  }

  return {
    buffer: image.buffer,
    mimeType: image.mimeType,
    provider: "google-gemini",
    model,
    rawText: readGeminiText(responsePayload),
  };
};

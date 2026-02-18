import { NextResponse } from "next/server";
import { BadRequestError, readJsonObject, readOptionalString } from "@/lib/http";
import { serverConfig } from "@/lib/serverConfig";

export const runtime = "nodejs";

type ReviewItem = {
  name: string;
  category?: string;
  brand?: string;
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data.");
  }
  return { mimeType: match[1], base64: match[2] };
};

const buildPrompt = (
  language: string,
  items: ReviewItem[],
  context: { gender?: string; occasion?: string; occasionDetail?: string; personalColor?: string }
) => {
  const itemLines = items
    .map((item, index) => {
      const details = [item.category, item.brand].filter(Boolean).join(" / ");
      return `${index + 1}. ${item.name}${details ? ` (${details})` : ""}`;
    })
    .join("\n");

  const isKorean = language.toLowerCase().includes("korean");
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
    context.occasion === "custom" ? context.occasionDetail : context.occasion ? occasionMap[context.occasion] || context.occasion : undefined;
  const occasion = occasionRaw || (isKorean ? "미지정" : "unspecified");
  const personalColor = context.personalColor
    ? personalColorMap[context.personalColor] || context.personalColor
    : isKorean
      ? "미지정"
      : "unspecified";

  return [
    `You are a professional fashion stylist.`,
    `Analyze the outfit in the image and provide a detailed but concise review in ${language}.`,
    `Use the items list as context, but prioritize what you see in the image.`,
    `Mention visible garments (top/bottom/outer/shoes), colors, fit, and proportions.`,
    `Tailor the advice for gender="${gender}", occasion="${occasion}", personalColor="${personalColor}".`,
    `If personal color is provided, state whether the palette flatters it and suggest better colors if not.`,
    `Write like a real stylist: specific item names (e.g., "short-sleeve denim shirt", "black denim jeans", "brown cropped puffer"),`,
    `explain color harmony and fit balance, and give 2-3 actionable improvements.`,
    `Item breakdown must list visible pieces as short lines like "상의: ...", "하의: ...", "아우터: ...", "신발: ..." in the output language.`,
    `Strengths and improvements should each include 2-3 concise bullet-style lines.`,
    `Do not mention numeric scores or ratings in any text fields; only use "overallScore" for scoring.`,
    `Always fill every field in the schema; if a detail is unknown, write a brief fallback like "확인 어려움" or "unknown".`,
    `Return JSON only. Do not include markdown or extra commentary.`,
    `Schema:`,
    `{"overallScore":number,"mood":string,"silhouette":string,"balance":string,"colorPalette":string,"fitAdvice":string,"colorAdvice":string,"itemBreakdown":string[],"strengths":string[],"improvements":string[],"occasions":string[],"summary":string}`,
    `Items:`,
    itemLines || "No items provided.",
  ].join("\n");
};

const extractJsonString = (input: string) => {
  const fenced =
    input.match(/```json\s*([\s\S]*?)```/i) ||
    input.match(/```([\s\S]*?)```/);
  const base = fenced?.[1]?.trim() || input.trim();

  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < base.length; i += 1) {
    const char = base[i];
    if (start === -1) {
      if (char === "{") {
        start = i;
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
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return base.slice(start, i + 1).trim();
      }
    }
  }

  return base;
};

const normalizeJsonLike = (input: string) => {
  let output = input.trim();
  output = output
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, "$1\"$2\":")
    .replace(/'([^']*)'\s*:/g, "\"$1\":")
    .replace(/:\s*'([^']*)'/g, ": \"$1\"")
    .replace(/\bundefined\b/g, "null")
    .replace(/\bNaN\b/g, "null");
  return output;
};

const parseReviewJson = (input: string) => {
  if (!input) return null;
  const candidate = extractJsonString(input);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    const normalized = normalizeJsonLike(candidate);
    try {
      return JSON.parse(normalized);
    } catch {
      return null;
    }
  }
};

export async function POST(request: Request) {
  try {
    const apiKey = serverConfig.geminiApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const model = serverConfig.geminiReviewModel;
    const body = await readJsonObject(request);
    const imageDataUrl = readOptionalString(body.imageDataUrl);
    const items = Array.isArray(body.items) ? (body.items as ReviewItem[]) : [];
    const language = readOptionalString(body.language) || "Korean";
    const context = {
      gender: readOptionalString(body.gender),
      occasion: readOptionalString(body.occasion),
      occasionDetail: readOptionalString(body.occasionDetail),
      personalColor: readOptionalString(body.personalColor),
    };

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Missing image data." }, { status: 400 });
    }

    const { mimeType, base64 } = parseDataUrl(imageDataUrl);

    const prompt = buildPrompt(language, items, context);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: {
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
            },
            response_mime_type: "application/json",
            response_schema: {
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
            },
            maxOutputTokens: 768,
          },
        }),
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message || "Failed to generate review." },
        { status: response.status }
      );
    }

    const parts = payload?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    const parsed = parseReviewJson(text);

    return NextResponse.json({
      review: parsed,
      rawText: parsed ? null : text,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process review." }, { status: 500 });
  }
}

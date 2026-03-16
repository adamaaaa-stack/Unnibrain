import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { serverEnv } from "@/lib/config/env";

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!serverEnv.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(serverEnv.GEMINI_API_KEY);
  }

  return geminiClient;
}

const DEFAULT_GEMINI_MODELS = ["gemini-3.0-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

function parseModelFallbacks(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildModelCandidates(params: {
  requestedModel?: string;
  preferredModel?: string;
  fallbackModels?: string[];
}): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const value of [...(params.requestedModel ? [params.requestedModel] : []), ...(params.preferredModel ? [params.preferredModel] : []), ...(params.fallbackModels ?? []), ...DEFAULT_GEMINI_MODELS]) {
    const model = value.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    candidates.push(model);
  }

  return candidates;
}

function isModelUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("is not supported for generatecontent") ||
    message.includes("model") && message.includes("not supported")
  );
}

export async function extractTextFromImageWithGemini(params: {
  mimeType: string;
  base64Data: string;
}): Promise<string> {
  const fallbackModels = parseModelFallbacks(serverEnv.GEMINI_MODEL_FALLBACKS);
  const models = buildModelCandidates({
    preferredModel: serverEnv.GEMINI_OCR_MODEL ?? serverEnv.GEMINI_MODEL,
    fallbackModels
  });
  const promptParts = [
    {
      text:
        "You perform OCR for student notes. Return only plain extracted text with line breaks. Do not summarize. If unreadable, return an empty string."
    },
    {
      inlineData: {
        mimeType: params.mimeType,
        data: params.base64Data
      }
    }
  ];

  let lastError: unknown;
  for (const modelName of models) {
    try {
      const model = getGeminiClient().getGenerativeModel({
        model: modelName
      });
      const response = await model.generateContent(promptParts);
      return response.response.text().trim();
    } catch (error) {
      lastError = error;
      if (!isModelUnavailableError(error)) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini OCR failed.");
}

function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Gemini returned an empty response.");
  }

  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

type StructuredGenerationOptions = {
  temperature?: number;
  maxRetries?: number;
  model?: string;
};

export async function generateStructuredWithGemini<T>(
  schema: z.ZodSchema<T>,
  prompt: string,
  options: StructuredGenerationOptions = {}
): Promise<T> {
  const retries = Math.max(1, options.maxRetries ?? 2);
  const fallbackModels = parseModelFallbacks(serverEnv.GEMINI_MODEL_FALLBACKS);
  const models = buildModelCandidates({
    requestedModel: options.model,
    preferredModel: serverEnv.GEMINI_MODEL,
    fallbackModels
  });
  let lastError: unknown;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const model = getGeminiClient().getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: options.temperature ?? 0.2
          }
        });

        const response = await model.generateContent(prompt);
        const rawText = response.response.text();
        const json = parseModelJson(rawText);
        return schema.parse(json);
      } catch (error) {
        lastError = error;
        if (isModelUnavailableError(error)) {
          break;
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini structured generation failed.");
}

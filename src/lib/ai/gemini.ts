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

export async function extractTextFromImageWithGemini(params: {
  mimeType: string;
  base64Data: string;
}): Promise<string> {
  const model = getGeminiClient().getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  const response = await model.generateContent([
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
  ]);

  return response.response.text().trim();
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
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const model = getGeminiClient().getGenerativeModel({
        model: options.model ?? "gemini-1.5-flash",
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
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini structured generation failed.");
}

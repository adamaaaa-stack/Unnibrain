import { z } from "zod";

import { serverEnv } from "@/lib/config/env";

const DEFAULT_OPENAI_MODELS = ["gpt-5-nano", "gpt-5-mini", "gpt-4.1-mini"];

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

  for (const value of [
    ...(params.requestedModel ? [params.requestedModel] : []),
    ...(params.preferredModel ? [params.preferredModel] : []),
    ...(params.fallbackModels ?? []),
    ...DEFAULT_OPENAI_MODELS
  ]) {
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
    message.includes("unsupported model") ||
    message.includes("model") && message.includes("not available") ||
    message.includes("model") && message.includes("does not exist")
  );
}

function requireOpenAIConfig() {
  const apiKey = serverEnv.OPENAI_API_KEY;
  const apiBase = serverEnv.OPENAI_API_BASE;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }
  if (!apiBase) {
    throw new Error("OPENAI_API_BASE is missing.");
  }
  return { apiKey, apiBase };
}

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

function extractResponseText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output)) {
    const parts: string[] = [];
    for (const item of payload.output) {
      if (!Array.isArray(item.content)) continue;
      for (const block of item.content) {
        if (block.type === "output_text" && typeof block.text === "string") {
          parts.push(block.text);
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  const messageContent = payload.choices?.[0]?.message?.content;
  if (typeof messageContent === "string" && messageContent.trim().length > 0) {
    return messageContent.trim();
  }
  if (Array.isArray(messageContent)) {
    const parts = messageContent
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  return "";
}

async function createOpenAIResponse(params: {
  model: string;
  input: unknown;
  temperature?: number;
}): Promise<OpenAIResponsePayload> {
  const { apiKey, apiBase } = requireOpenAIConfig();
  const body: Record<string, unknown> = {
    model: params.model,
    input: params.input
  };

  if (typeof params.temperature === "number") {
    body.temperature = params.temperature;
  }

  const response = await fetch(`${apiBase}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenAI Responses failed (${response.status}): ${errorText || "No error body."}`);
  }

  return (await response.json()) as OpenAIResponsePayload;
}

export async function extractTextFromImageWithGemini(params: {
  mimeType: string;
  base64Data: string;
}): Promise<string> {
  const fallbackModels = parseModelFallbacks(serverEnv.OPENAI_MODEL_FALLBACKS);
  const models = buildModelCandidates({
    preferredModel: serverEnv.OPENAI_OCR_MODEL ?? serverEnv.OPENAI_MODEL,
    fallbackModels
  });

  let lastError: unknown;
  for (const modelName of models) {
    try {
      const response = await createOpenAIResponse({
        model: modelName,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "You perform OCR for student notes. Return only plain extracted text with line breaks. Do not summarize. If unreadable, return an empty string."
              },
              {
                type: "input_image",
                image_url: `data:${params.mimeType};base64,${params.base64Data}`
              }
            ]
          }
        ]
      });
      const text = extractResponseText(response);
      if (!text) {
        throw new Error("OpenAI OCR returned an empty response.");
      }
      return text;
    } catch (error) {
      lastError = error;
      if (!isModelUnavailableError(error)) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI OCR failed.");
}

function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("OpenAI returned an empty response.");
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
  const fallbackModels = parseModelFallbacks(serverEnv.OPENAI_MODEL_FALLBACKS);
  const models = buildModelCandidates({
    requestedModel: options.model,
    preferredModel: serverEnv.OPENAI_MODEL,
    fallbackModels
  });
  let lastError: unknown;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const response = await createOpenAIResponse({
          model: modelName,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                }
              ]
            }
          ],
          temperature: options.temperature ?? 0.2
        });
        const rawText = extractResponseText(response);
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

  throw lastError instanceof Error ? lastError : new Error("OpenAI structured generation failed.");
}

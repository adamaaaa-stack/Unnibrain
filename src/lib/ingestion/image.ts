import { extractTextFromImageWithGemini } from "@/lib/ai/gemini";

export async function extractTextFromImageBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const base64Data = buffer.toString("base64");
  return extractTextFromImageWithGemini({
    mimeType,
    base64Data
  });
}

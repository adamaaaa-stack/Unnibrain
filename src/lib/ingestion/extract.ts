import path from "node:path";

import { extractTextFromImageBuffer } from "@/lib/ingestion/image";
import { ALLOWED_MIME_TYPES, IMAGE_MIME_TYPES, INGESTION_LIMITS, TEXT_MIME_TYPES } from "@/lib/ingestion/constants";
import { normalizeExtractedText } from "@/lib/ingestion/normalize";
import { extractTextFromPdfBuffer } from "@/lib/ingestion/pdf";
import { extractTextFromTextFile } from "@/lib/ingestion/text";

export type SourceKind = "raw_text" | "pdf_page" | "image_ocr" | "text_file";

export type ExtractedSource = {
  sourceKind: SourceKind;
  sourceName: string | null;
  extractedText: string;
  fileMimeType?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  fileSize?: number;
};

function detectMimeType(file: File): string {
  const rawType = file.type?.toLowerCase().trim();
  if (rawType) {
    return rawType;
  }

  const ext = path.extname(file.name ?? "").toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".txt") return "text/plain";
  if (ext === ".md") return "text/markdown";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  return "application/octet-stream";
}

export function validateFiles(files: File[]): void {
  if (files.length > INGESTION_LIMITS.maxFiles) {
    throw new Error(`You can upload up to ${INGESTION_LIMITS.maxFiles} files per course.`);
  }

  let totalBytes = 0;
  for (const file of files) {
    const mimeType = detectMimeType(file);
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported file type for "${file.name}".`);
    }
    if (file.size <= 0) {
      throw new Error(`"${file.name}" is empty.`);
    }
    if (file.size > INGESTION_LIMITS.maxFileSizeBytes) {
      throw new Error(`"${file.name}" exceeds ${Math.round(INGESTION_LIMITS.maxFileSizeBytes / (1024 * 1024))}MB.`);
    }
    totalBytes += file.size;
  }

  if (totalBytes > INGESTION_LIMITS.maxTotalUploadBytes) {
    throw new Error(
      `Total upload size exceeds ${Math.round(INGESTION_LIMITS.maxTotalUploadBytes / (1024 * 1024))}MB for this deployment target.`
    );
  }
}

export async function extractFromPastedText(input: string): Promise<ExtractedSource> {
  const text = normalizeExtractedText(input);
  return {
    sourceKind: "raw_text",
    sourceName: "Pasted notes",
    extractedText: text
  };
}

export async function extractFromFile(file: File): Promise<ExtractedSource> {
  const mimeType = detectMimeType(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type for "${file.name}".`);
  }

  let rawText = "";
  let sourceKind: SourceKind = "text_file";

  if (mimeType === "application/pdf") {
    sourceKind = "pdf_page";
    rawText = await extractTextFromPdfBuffer(buffer);
  } else if (IMAGE_MIME_TYPES.has(mimeType)) {
    sourceKind = "image_ocr";
    rawText = await extractTextFromImageBuffer(buffer, mimeType);
  } else if (TEXT_MIME_TYPES.has(mimeType)) {
    sourceKind = "text_file";
    rawText = await extractTextFromTextFile(file, buffer);
  } else {
    throw new Error(`Unsupported file type for "${file.name}".`);
  }

  return {
    sourceKind,
    sourceName: file.name,
    extractedText: normalizeExtractedText(rawText),
    fileMimeType: mimeType,
    fileBuffer: buffer,
    fileName: file.name,
    fileSize: file.size
  };
}

export function resolveCourseSourceType(hasPastedText: boolean, fileSources: ExtractedSource[]) {
  if (hasPastedText && fileSources.length > 0) return "mixed" as const;
  if (hasPastedText) return "pasted_text" as const;

  const mimeSet = new Set(fileSources.map((source) => source.fileMimeType));
  if (mimeSet.size === 1 && mimeSet.has("application/pdf")) return "pdf" as const;
  if ([...mimeSet].every((type) => !!type && IMAGE_MIME_TYPES.has(type))) return "image" as const;
  if ([...mimeSet].every((type) => !!type && TEXT_MIME_TYPES.has(type))) return "text_file" as const;
  return "mixed" as const;
}

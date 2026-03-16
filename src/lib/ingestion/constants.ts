export const INGESTION_LIMITS = {
  maxFiles: 10,
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxTotalExtractedChars: 220_000,
  minTotalExtractedChars: 120
} as const;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/markdown"
]);

export const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
export const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif"
]);

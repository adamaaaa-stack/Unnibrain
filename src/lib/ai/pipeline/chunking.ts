import { normalizeExtractedText } from "@/lib/ingestion/normalize";

type ChunkingOptions = {
  maxChunkChars?: number;
  overlapChars?: number;
};

export function chunkText(input: string, options: ChunkingOptions = {}): string[] {
  const text = normalizeExtractedText(input);
  const maxChunkChars = Math.max(2000, options.maxChunkChars ?? 12000);
  const overlapChars = Math.max(0, options.overlapChars ?? 500);

  if (text.length <= maxChunkChars) {
    return [text];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const maxEnd = Math.min(text.length, cursor + maxChunkChars);
    let end = maxEnd;

    if (maxEnd < text.length) {
      const boundary = text.lastIndexOf("\n", maxEnd);
      if (boundary > cursor + 1200) {
        end = boundary;
      }
    }

    const chunk = text.slice(cursor, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    cursor = Math.max(0, end - overlapChars);
  }

  return chunks;
}

function pickEvenlySpacedIndices(total: number, count: number): number[] {
  if (count >= total) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const step = (total - 1) / (count - 1);
  const indices = new Set<number>();

  for (let i = 0; i < count; i += 1) {
    indices.add(Math.round(i * step));
  }

  return [...indices].sort((a, b) => a - b);
}

export function buildSourceContext(text: string): string {
  const normalized = normalizeExtractedText(text);
  if (normalized.length <= 60000) {
    return normalized;
  }

  const chunks = chunkText(normalized, {
    maxChunkChars: 10000,
    overlapChars: 300
  });
  const selectedIndices = pickEvenlySpacedIndices(chunks.length, Math.min(8, chunks.length));

  return selectedIndices
    .map((index) => `Chunk ${index + 1}/${chunks.length}:\n${chunks[index]}`)
    .join("\n\n---\n\n");
}

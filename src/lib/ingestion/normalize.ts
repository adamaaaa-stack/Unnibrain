export function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\u0000/g, "")
    .trim();
}

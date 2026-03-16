export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = pdfModule.default;
  const parsed = await pdfParse(buffer);
  return parsed.text ?? "";
}

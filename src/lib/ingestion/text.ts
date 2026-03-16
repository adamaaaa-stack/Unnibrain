export async function extractTextFromTextFile(file: File, buffer: Buffer): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  try {
    return decoder.decode(buffer);
  } catch {
    const fallback = await file.text();
    return fallback;
  }
}

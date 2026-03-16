import { createHash } from "node:crypto";

export function computeSourceHash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

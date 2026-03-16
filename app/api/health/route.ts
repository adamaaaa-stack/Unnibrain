import { ok } from "@/lib/http/responses";

export async function GET() {
  return ok({
    status: "ok",
    service: "unibrain",
    timestamp: new Date().toISOString()
  });
}

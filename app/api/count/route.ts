import { connection, type NextRequest } from "next/server";
import { recordCount, wantsCounting } from "@/lib/count-visit";

// POST /api/count {"m": "view", "p": "/whats-on"}: adds one to today's
// count for a public page, sent by the page itself (components/count-visits).
// Nothing about the visitor is read or kept.
export async function POST(request: NextRequest) {
  await connection();
  if (wantsCounting(request)) {
    let body: { m?: unknown; p?: unknown } | null = null;
    try {
      body = JSON.parse(await request.text());
    } catch {
      // Not ours: ignore it.
    }
    await recordCount(body?.m, body?.p);
  }
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}

import type { NextRequest } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { hashCode, isCode } from "@/lib/weekly-email";

// POST /api/weekly/leave?code=…: an email program's own "Unsubscribe"
// button (List-Unsubscribe-Post). The address is deleted at once. The
// same answer whether or not it was there.
export async function POST(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (isCode(code)) {
    const db = createPublicServerClient();
    await db?.rpc("unsubscribe_digest", { code_hash: hashCode(code) });
  }
  return new Response("Unsubscribed.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

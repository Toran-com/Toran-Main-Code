import type { NextRequest } from "next/server";
import { isCronRequest, runNightly } from "@/lib/nightly";
import { createRobotClient } from "@/lib/supabase/robot";

// GET /api/cron/nightly: the nightly job, started by Vercel Cron
// (vercel.json) with the CRON_SECRET. Anyone else gets "not found".
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  const db = createRobotClient();
  if (!db) {
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }
  return Response.json(await runNightly(db), {
    headers: { "cache-control": "no-store" },
  });
}

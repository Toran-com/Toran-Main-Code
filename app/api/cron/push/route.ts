import type { NextRequest } from "next/server";
import { isCronRequest } from "@/lib/nightly";
import { runDailyPush } from "@/lib/push";
import { createRobotClient } from "@/lib/supabase/robot";

// GET /api/cron/push: the day's phone notifications (decision 0024), one
// per browser listing the new events at the mandirs it follows. Started by
// Vercel Cron (vercel.json) early each evening with the CRON_SECRET.
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
  return Response.json(await runDailyPush(db), {
    headers: { "cache-control": "no-store" },
  });
}

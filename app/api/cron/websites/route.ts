import type { NextRequest } from "next/server";
import { isCronRequest } from "@/lib/nightly";
import { createRobotClient } from "@/lib/supabase/robot";
import { runWebsiteSync } from "@/lib/website-connect";

// GET /api/cron/websites: reads every website a committee connected
// (decision 0032), longest ago first, publishing or queueing what it lists
// and reading a few new posters with AI. Started by Vercel Cron
// (vercel.json) each night after the nightly job, with the CRON_SECRET.
export const maxDuration = 300;

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
  return Response.json(await runWebsiteSync(db), {
    headers: { "cache-control": "no-store" },
  });
}

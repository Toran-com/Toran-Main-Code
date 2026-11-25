import type { NextRequest } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { isCronRequest } from "@/lib/nightly";
import { runSevaRoundup, sevaEmailOn } from "@/lib/seva-email";
import { siteUrl } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";

// GET /api/cron/seva: the evening seva roundup to each mandir's committee
// (decision 0029): the places taken on Toran since the last one. Started
// by Vercel Cron (vercel.json) each evening with the CRON_SECRET. Off
// unless committee emails are on (COMMITTEE_EMAIL) and a sender is set up.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  if (!sevaEmailOn()) {
    return Response.json(
      { skipped: "The committee emails aren't switched on." },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const db = createRobotClient();
  if (!db) {
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }
  return Response.json(
    await runSevaRoundup(db, siteUrl(), {
      send: (to, email) => sendEmail(to, email),
    }),
    { headers: { "cache-control": "no-store" } },
  );
}

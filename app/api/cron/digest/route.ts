import type { NextRequest } from "next/server";
import { runCommitteeDigest } from "@/lib/committee-digest-send";
import { committeeEmailOn } from "@/lib/committee-email";
import { mailerReady, sendEmail } from "@/lib/mailer";
import { isCronRequest } from "@/lib/nightly";
import { siteUrl } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";

// GET /api/cron/digest: the weekly email to each mandir's committee
// (decision 0030), last week on their page. Started by Vercel Cron
// (vercel.json) on Monday mornings with the CRON_SECRET. Off unless
// COMMITTEE_EMAIL is "on" and an email sender is set up.
export const maxDuration = 60;

// Stop starting new committees after this, to finish inside the time
// limit; the rest go on the next run.
const BUDGET_MS = 45_000;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  if (!(committeeEmailOn() && mailerReady())) {
    return Response.json(
      { skipped: "The committee email isn't switched on." },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const started = Date.now();
  const db = createRobotClient();
  if (!db) {
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }
  return Response.json(
    await runCommitteeDigest(db, siteUrl(), {
      send: (to, email) => sendEmail(to, email),
      timeLeft: () => Date.now() - started <= BUDGET_MS,
    }),
    { headers: { "cache-control": "no-store" } },
  );
}

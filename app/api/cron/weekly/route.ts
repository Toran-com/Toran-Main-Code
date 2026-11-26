import type { NextRequest } from "next/server";
import { listFestivalDates } from "@/lib/directory";
import { mailerReady, sendEmail } from "@/lib/mailer";
import { isCronRequest } from "@/lib/nightly";
import { siteUrl } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";
import { leaveCode, weeklyEmailOn } from "@/lib/weekly-email";
import { runWeekly } from "@/lib/weekly-send";
import { listUpcomingEvents } from "@/lib/whats-on";

// GET /api/cron/weekly: started by Vercel Cron (vercel.json) every
// Thursday with the CRON_SECRET. Sends the weekly "What's on" email
// (DIGEST_SIGNUPS "on"); it does nothing until it's switched on and an
// email sender is set up. (Committees' own weekly email goes on Mondays,
// from /api/cron/digest.)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  const weekly = weeklyEmailOn() && mailerReady();
  if (!weekly) {
    return Response.json({ skipped: "The weekly email isn't switched on." });
  }
  const db = createRobotClient();
  if (!db) {
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }

  const [events, dates] = await Promise.all([
    listUpcomingEvents(),
    listFestivalDates(),
  ]);
  const weeklySummary =
    events.state === "ok"
      ? await runWeekly(
          db,
          {
            events: events.data,
            dates: dates.state === "ok" ? dates.data : [],
          },
          siteUrl(),
          {
            send: (to, email) => sendEmail(to, email),
            leaveCode: (e) => leaveCode(e),
          },
        )
      : { error: "Events couldn't be read" };

  return Response.json(
    { weekly: weeklySummary },
    { headers: { "cache-control": "no-store" } },
  );
}

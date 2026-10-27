import type { NextRequest } from "next/server";
import { listFestivalDates } from "@/lib/directory";
import { mailerReady, sendEmail } from "@/lib/mailer";
import { isCronRequest } from "@/lib/nightly";
import { siteUrl } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";
import { leaveCode, weeklyEmailOn } from "@/lib/weekly-email";
import { runWeekly } from "@/lib/weekly-send";
import { listUpcomingEvents } from "@/lib/whats-on";

// GET /api/cron/weekly: the weekly "What's on" email, started by Vercel
// Cron (vercel.json) with the CRON_SECRET. Does nothing until the weekly
// email is switched on and an email sender is set up.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  if (!weeklyEmailOn() || !mailerReady()) {
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
  if (events.state !== "ok") {
    return Response.json({ error: "Events couldn't be read" }, { status: 503 });
  }
  const summary = await runWeekly(
    db,
    { events: events.data, dates: dates.state === "ok" ? dates.data : [] },
    siteUrl(),
    {
      send: (to, email) => sendEmail(to, email),
      leaveCode: (e) => leaveCode(e),
    },
  );
  return Response.json(summary, { headers: { "cache-control": "no-store" } });
}

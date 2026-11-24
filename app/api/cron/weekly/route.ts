import type { NextRequest } from "next/server";
import {
  committeeEmailOn,
  runCommitteeMonthly,
} from "@/lib/committee-monthly-send";
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
// (DIGEST_SIGNUPS "on"), and the monthly email to committees that haven't
// had this month's yet (COMMITTEE_EMAIL "on"): so on the first Thursday of
// the month, and any left over the week after. Each does nothing until
// it's switched on and an email sender is set up.
export const maxDuration = 60;

// Committee emails stop starting after this, to finish inside the time
// limit; the rest go next week.
const COMMITTEE_BUDGET_MS = 40_000;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return new Response("Not found", { status: 404 });
  }
  const weekly = weeklyEmailOn() && mailerReady();
  const committees = committeeEmailOn() && mailerReady();
  if (!weekly && !committees) {
    return Response.json({
      skipped: "The weekly and committee emails aren't switched on.",
    });
  }
  const started = Date.now();
  const db = createRobotClient();
  if (!db) {
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }

  let weeklySummary: unknown = {
    skipped: "The weekly email isn't switched on.",
  };
  if (weekly) {
    const [events, dates] = await Promise.all([
      listUpcomingEvents(),
      listFestivalDates(),
    ]);
    weeklySummary =
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
  }

  const committeeSummary = committees
    ? await runCommitteeMonthly(db, siteUrl(), {
        send: (to, email) => sendEmail(to, email),
        timeLeft: () => Date.now() - started <= COMMITTEE_BUDGET_MS,
      })
    : { skipped: "The committee email isn't switched on." };

  return Response.json(
    { weekly: weeklySummary, committees: committeeSummary },
    { headers: { "cache-control": "no-store" } },
  );
}

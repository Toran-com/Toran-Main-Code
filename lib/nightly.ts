import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  checkWebsite,
  type CheckResult,
  readCalendar,
} from "@/lib/website-check";
import {
  calendarQueue,
  recordCalendarRead,
  recordWebsiteCheck,
  websiteQueue,
} from "@/lib/website-claims";

// The nightly job (/api/cron/nightly, decision 0016): deletes what the
// retention policy says to delete, reads every mandir's own events
// calendar, then checks the mandir websites checked longest ago, and
// records what it did as totals.

// Websites to check in one night, a few at a time. One check can take
// about 33 seconds (lib/website-check.ts), so new checks stop starting
// after BUDGET_MS to finish inside the route's time limit (60 seconds).
export const NIGHTLY_WEBSITES = 12;
const AT_ONCE = 3;
const BUDGET_MS = 20_000;

// Calendars are one quick read each (a few seconds at most), so all of
// them are read every night, first, within their own share of the time.
export const NIGHTLY_CALENDARS = 60;
const CALENDARS_AT_ONCE = 6;
const CALENDAR_BUDGET_MS = 10_000;

type Tally = { checked: number; added: number; failed: number };

export type NightlySummary = {
  retention: Record<string, number> | null;
  calendars?: Tally;
  websites: Tally;
};

// Runs "work" on each item, a few at a time, until they're done or the
// time's up, and counts how it went.
async function inTurn<T>(
  items: T[],
  atOnce: number,
  timeLeft: () => boolean,
  work: (item: T) => Promise<{ added: number } | null>,
): Promise<Tally> {
  const tally: Tally = { checked: 0, added: 0, failed: 0 };
  const queue = [...items];
  const worker = async () => {
    for (;;) {
      if (!timeLeft()) return;
      const item = queue.shift();
      if (item === undefined) return;
      const saved = await work(item);
      if (saved) {
        tally.checked++;
        tally.added += saved.added;
      } else {
        tally.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: atOnce }, worker));
  return tally;
}

// Whether a request carries the cron secret (Vercel sends it as
// "Authorization: Bearer <CRON_SECRET>"). No secret set means no runs.
export function isCronRequest(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret || !authorization) return false;
  const given = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function runNightly(
  db: SupabaseClient<Database>,
  check: (url: string) => Promise<CheckResult> = checkWebsite,
  now: () => number = Date.now,
  read: (url: string) => Promise<CheckResult> = readCalendar,
): Promise<NightlySummary> {
  const started = now();
  const { data: retention, error } = await db.rpc("run_retention");

  const calendars = await inTurn(
    await calendarQueue(db, NIGHTLY_CALENDARS),
    CALENDARS_AT_ONCE,
    () => now() - started <= CALENDAR_BUDGET_MS,
    async (calendar) =>
      recordCalendarRead(db, calendar, await read(calendar.url)),
  );
  const websites = await inTurn(
    await websiteQueue(db, NIGHTLY_WEBSITES),
    AT_ONCE,
    () => now() - started <= BUDGET_MS,
    async (mandir) =>
      recordWebsiteCheck(db, mandir, await check(mandir.website)),
  );

  const summary: NightlySummary = {
    retention: error ? null : (retention as Record<string, number>),
    calendars,
    websites,
  };
  await db.from("job_runs").insert({ job: "nightly", summary });
  return summary;
}

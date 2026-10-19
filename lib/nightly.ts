import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { checkWebsite, type CheckResult } from "@/lib/website-check";
import { recordWebsiteCheck, websiteQueue } from "@/lib/website-claims";

// The nightly job (/api/cron/nightly, decision 0016): deletes what the
// retention policy says to delete, then checks the mandir websites
// checked longest ago, and records what it did as totals.

// Websites to check in one night, a few at a time. One check can take
// about 33 seconds (lib/website-check.ts), so new checks stop starting
// after BUDGET_MS to finish inside the route's time limit (60 seconds).
export const NIGHTLY_WEBSITES = 12;
const AT_ONCE = 3;
const BUDGET_MS = 20_000;

export type NightlySummary = {
  retention: Record<string, number> | null;
  websites: { checked: number; added: number; failed: number };
};

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
): Promise<NightlySummary> {
  const started = now();
  const { data: retention, error } = await db.rpc("run_retention");

  const queue = await websiteQueue(db, NIGHTLY_WEBSITES);
  const websites = { checked: 0, added: 0, failed: 0 };
  // A few workers take websites from the queue until it's empty or the
  // time's up.
  const worker = async () => {
    for (;;) {
      if (now() - started > BUDGET_MS) return;
      const mandir = queue.shift();
      if (!mandir) return;
      const saved = await recordWebsiteCheck(
        db,
        mandir,
        await check(mandir.website),
      );
      if (saved) {
        websites.checked++;
        websites.added += saved.added;
      } else {
        websites.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  const summary: NightlySummary = {
    retention: error ? null : (retention as Record<string, number>),
    websites,
  };
  await db.from("job_runs").insert({ job: "nightly", summary });
  return summary;
}

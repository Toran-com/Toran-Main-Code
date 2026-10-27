import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { FestivalDate } from "@/lib/directory";
import { buildDigest, digestHtml, digestText, digestTitle } from "@/lib/digest";
import { type Email, weeklyEmail } from "@/lib/weekly-email";
import type { ListedEvent } from "@/lib/whats-on";

// The weekly send (/api/cron/weekly): the coming week's digest to each
// confirmed subscriber, for their region or the whole UK, with their own
// unsubscribe link. Each is sent at most once in six days, so a second
// run in the same week sends nothing new. Totals only go in the job log.

export const MAX_PER_RUN = 300;
const SIX_DAYS_MS = 6 * 86_400_000;

// "more": there were more due than one run sends; the next run sends them.
export type WeeklySummary = { sent: number; failed: number; more: boolean };

export async function runWeekly(
  db: SupabaseClient<Database>,
  data: { events: readonly ListedEvent[]; dates: readonly FestivalDate[] },
  site: string,
  deps: {
    send: (to: string, email: Email) => Promise<boolean>;
    leaveCode: (email: string) => string | null;
    now?: Date;
  },
): Promise<WeeklySummary> {
  const now = deps.now ?? new Date();
  const since = new Date(now.getTime() - SIX_DAYS_MS).toISOString();
  const { data: rows } = await db
    .from("digest_subscribers")
    .select("id, email, region")
    .not("confirmed_at", "is", null)
    .or(`last_sent_at.is.null,last_sent_at.lt.${since}`)
    .order("last_sent_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN + 1);
  const due = rows ?? [];
  const batch = due.slice(0, MAX_PER_RUN);

  // One digest per region (and one for the whole UK).
  const digests = new Map<string, Email>();
  const digestFor = (region: string | null) => {
    const key = region ?? "";
    let built = digests.get(key);
    if (!built) {
      const digest = buildDigest(data.events, data.dates, now, region);
      built = {
        subject: digestTitle(digest),
        text: digestText(digest, site),
        html: digestHtml(digest, site),
      };
      digests.set(key, built);
    }
    return built;
  };

  const summary: WeeklySummary = {
    sent: 0,
    failed: 0,
    more: due.length > MAX_PER_RUN,
  };
  for (const s of batch) {
    const code = deps.leaveCode(s.email);
    // No way to leave means no email.
    if (
      !code ||
      !(await deps.send(s.email, weeklyEmail(digestFor(s.region), site, code)))
    ) {
      summary.failed++;
      continue;
    }
    await db
      .from("digest_subscribers")
      .update({ last_sent_at: now.toISOString() })
      .eq("id", s.id);
    summary.sent++;
  }
  await db.from("job_runs").insert({ job: "weekly", summary });
  return summary;
}

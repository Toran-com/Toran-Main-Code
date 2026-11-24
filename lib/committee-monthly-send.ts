import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCommitteeFacts } from "@/lib/committee-facts";
import { committeeMonthly, MONTHLY_DAYS } from "@/lib/committee-monthly";
import { committeeTasks } from "@/lib/committee-tasks";
import type { Database } from "@/lib/database.types";
import { londonDate } from "@/lib/london";
import {
  mandirNumbers,
  periodDays,
  readSummary,
  readSupporters,
} from "@/lib/stats";
import type { Email } from "@/lib/weekly-email";

// Sending the monthly email (lib/committee-monthly.ts) to each committee
// member who hasn't stopped it, once a month, from the weekly job. Off
// unless COMMITTEE_EMAIL is "on" and an email sender is set up. A mandir is
// marked done for the month once its email has gone, so a run that stops
// part way carries on next week without sending twice. Committees whose
// first member joined in the last two weeks wait for the next month.

export function committeeEmailOn(
  setting: string | undefined = process.env.COMMITTEE_EMAIL,
): boolean {
  return setting === "on";
}

// The code in each member's "stop" link: worked out from who they are and
// which mandir, with a secret only the site knows (CRON_SECRET), so it
// needn't be stored and can't be made up for someone else.
export function stopCode(
  userId: string,
  mandirId: string,
  secret: string | undefined = process.env.CRON_SECRET,
): string | null {
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`committee-email:${userId}:${mandirId}`)
    .digest()
    .subarray(0, 24)
    .toString("base64url");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function checkStopCode(
  userId: unknown,
  mandirId: unknown,
  code: unknown,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (
    typeof userId !== "string" ||
    typeof mandirId !== "string" ||
    typeof code !== "string" ||
    !UUID.test(userId) ||
    !UUID.test(mandirId)
  ) {
    return false;
  }
  const expected = stopCode(userId, mandirId, secret);
  if (!expected) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function stopQuery(userId: string, mandirId: string, code: string): string {
  return new URLSearchParams({ u: userId, m: mandirId, c: code }).toString();
}

export function stopUrl(
  site: string,
  userId: string,
  mandirId: string,
  code: string,
): string {
  return `${site}/committee-email/stop?${stopQuery(userId, mandirId, code)}`;
}

// For an email program's own "Unsubscribe" button (List-Unsubscribe-Post).
export function oneClickStopUrl(
  site: string,
  userId: string,
  mandirId: string,
  code: string,
): string {
  return `${site}/api/committee-email/stop?${stopQuery(userId, mandirId, code)}`;
}

type DueMandir = {
  id: string;
  slug: string;
  name: string;
  town: string;
  calendar: string | null;
  postcode: string | null;
  website: string | null;
  phone: string | null;
};

export type Due = {
  mandir: DueMandir;
  recipients: { user_id: string; email: string }[];
  members: number;
  paths: unknown;
  supporters: unknown;
};

// What committee_emails_due answered, ignoring anything malformed.
export function readDue(value: unknown): Due[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const r = row as Partial<Due> | null;
    const m = r?.mandir as Partial<DueMandir> | undefined;
    if (!m || typeof m.id !== "string" || typeof m.slug !== "string") {
      return [];
    }
    const recipients = Array.isArray(r?.recipients)
      ? r.recipients.filter(
          (x): x is Due["recipients"][number] =>
            !!x &&
            typeof x.user_id === "string" &&
            typeof x.email === "string" &&
            x.email.includes("@"),
        )
      : [];
    return [
      {
        mandir: {
          id: m.id,
          slug: m.slug,
          name: String(m.name ?? ""),
          town: String(m.town ?? ""),
          calendar: m.calendar ?? null,
          postcode: m.postcode ?? null,
          website: m.website ?? null,
          phone: m.phone ?? null,
        },
        recipients,
        members: Math.max(1, Number(r?.members) || 1),
        paths: r?.paths,
        supporters: r?.supporters,
      },
    ];
  });
}

export type CommitteeEmailSummary = {
  month: string;
  mandirs: number;
  sent: number;
  failed: number;
  // Mandirs left for next week's run (out of time, or every send failed).
  left: number;
  error?: string;
};

export async function runCommitteeMonthly(
  db: SupabaseClient<Database>,
  site: string,
  deps: {
    send: (to: string, email: Email) => Promise<boolean>;
    code?: (userId: string, mandirId: string) => string | null;
    now?: Date;
    timeLeft?: () => boolean;
    loadFacts?: typeof loadCommitteeFacts;
  },
): Promise<CommitteeEmailSummary> {
  const now = deps.now ?? new Date();
  const code = deps.code ?? ((u, m) => stopCode(u, m));
  const timeLeft = deps.timeLeft ?? (() => true);
  const today = londonDate(now);
  const month = today.slice(0, 7);
  const since = periodDays(today, MONTHLY_DAYS)[0];
  const summary: CommitteeEmailSummary = {
    month,
    mandirs: 0,
    sent: 0,
    failed: 0,
    left: 0,
  };

  const { data, error } = await db.rpc("committee_emails_due", {
    for_month: month,
    since,
  });
  if (error) {
    summary.error = "The committees couldn't be read.";
    return summary;
  }
  const due = readDue(data);
  for (const [i, item] of due.entries()) {
    if (!timeLeft()) {
      summary.left = due.length - i;
      break;
    }
    const { mandir } = item;
    let sent = 0;
    if (item.recipients.length) {
      const facts = await (deps.loadFacts ?? loadCommitteeFacts)(
        db,
        mandir,
        now,
        item.members,
      );
      const content = {
        mandir,
        numbers: mandirNumbers(
          readSummary({ days: [], paths: item.paths }),
          mandir.slug,
        ),
        supporters: readSupporters(item.supporters),
        events: facts.events.filter((e) => e.status === "published"),
        tasks: committeeTasks(facts),
        siteUrl: site,
      };
      for (const r of item.recipients) {
        const c = code(r.user_id, mandir.id);
        if (!c) {
          summary.failed++;
          continue;
        }
        const email = committeeMonthly({
          ...content,
          stopUrl: stopUrl(site, r.user_id, mandir.id, c),
        });
        const ok = await deps.send(r.email, {
          ...email,
          headers: {
            "List-Unsubscribe": `<${oneClickStopUrl(site, r.user_id, mandir.id, c)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (ok) sent++;
        else summary.failed++;
      }
      // Every send failed: try again next week.
      if (sent === 0) {
        summary.left++;
        continue;
      }
    }
    summary.mandirs++;
    summary.sent += sent;
    await db
      .from("committee_emails_sent")
      .insert({ mandir_id: mandir.id, month, recipients: sent });
  }
  await db.from("job_runs").insert({ job: "committee-email", summary });
  return summary;
}

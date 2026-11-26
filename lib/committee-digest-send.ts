import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCommitteeFacts } from "@/lib/committee-facts";
import {
  committeeDigest,
  lastWeekStart,
  type DigestContent,
  weekFigures,
  weekKey,
  weekLabel,
} from "@/lib/committee-digest";
import { stopCode, stopUrl, unsubscribeHeaders } from "@/lib/committee-email";
import { committeeTasks } from "@/lib/committee-tasks";
import type { Database } from "@/lib/database.types";
import { cardPath } from "@/lib/digest-card";
import { londonDate } from "@/lib/london";
import { readSummary, readSupporters } from "@/lib/stats";
import type { Email } from "@/lib/weekly-email";

// Sending the weekly email (lib/committee-digest.ts) to each committee
// member who hasn't stopped it, from the Monday job (/api/cron/digest). Off
// unless COMMITTEE_EMAIL is "on" and an email sender is set up. A mandir is
// marked done for the week once its email has gone, so a run that stops
// part way (or runs twice) doesn't send twice; one whose every send failed
// is tried again on the next run that week. Committees whose first member
// joined in the last week wait for the next.

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

export type DueDigest = {
  mandir: DueMandir;
  recipients: { user_id: string; email: string }[];
  members: number;
  counts: unknown;
  weekPaths: unknown;
  supporters: unknown;
  supportersBoth: unknown;
};

// What committee_digests_due answered, ignoring anything malformed.
export function readDueDigests(value: unknown): DueDigest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const r = row as Record<string, unknown> | null;
    const m = r?.mandir as Partial<DueMandir> | undefined;
    if (!m || typeof m.id !== "string" || typeof m.slug !== "string") {
      return [];
    }
    const recipients = Array.isArray(r?.recipients)
      ? (r.recipients as unknown[]).filter(
          (x): x is DueDigest["recipients"][number] =>
            !!x &&
            typeof (x as { user_id?: unknown }).user_id === "string" &&
            typeof (x as { email?: unknown }).email === "string" &&
            (x as { email: string }).email.includes("@"),
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
        counts: r?.counts,
        weekPaths: r?.week_paths,
        supporters: r?.supporters,
        supportersBoth: r?.supporters_both,
      },
    ];
  });
}

// Everything the email says for one mandir, except whose stop link.
export async function digestContent(
  db: SupabaseClient<Database>,
  item: Omit<DueDigest, "recipients">,
  weekStart: string,
  site: string,
  deps: {
    now?: Date;
    loadFacts?: typeof loadCommitteeFacts;
    card?: typeof cardPath;
  } = {},
): Promise<Omit<DigestContent, "stopUrl">> {
  const { mandir } = item;
  const figures = weekFigures({
    weekStart,
    counts: readSummary(item.counts),
    weekPaths: readSummary({ days: [], paths: item.weekPaths }).paths,
    supporters: readSupporters(item.supporters),
    supportersBoth: readSupporters(item.supportersBoth),
  });
  const [facts, top] = await Promise.all([
    (deps.loadFacts ?? loadCommitteeFacts)(
      db,
      mandir,
      deps.now ?? new Date(),
      item.members,
    ),
    figures.topEvent
      ? db
          .from("events")
          .select("id, title")
          .eq("id", figures.topEvent.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const card = deps.card ?? cardPath;
  const picture = {
    name: mandir.name,
    week: weekLabel(weekStart),
    days: figures.days,
    before: figures.before,
    followers: figures.followers,
    newFollowers: figures.newFollowers,
  };
  return {
    mandir,
    weekStart,
    figures,
    topEvent:
      top.data && figures.topEvent
        ? { ...figures.topEvent, title: top.data.title }
        : null,
    events: facts.events.filter((e) => e.status === "published"),
    tasks: committeeTasks(facts),
    siteUrl: site,
    cards: {
      week: card({ kind: "week", ...picture }),
      share: card({ kind: "share", ...picture }),
    },
  };
}

export type CommitteeDigestSummary = {
  week: string;
  mandirs: number;
  sent: number;
  failed: number;
  // Mandirs left for the next run (out of time, or every send failed).
  left: number;
  error?: string;
};

export async function runCommitteeDigest(
  db: SupabaseClient<Database>,
  site: string,
  deps: {
    send: (to: string, email: Email) => Promise<boolean>;
    code?: (userId: string, mandirId: string) => string | null;
    now?: Date;
    timeLeft?: () => boolean;
    loadFacts?: typeof loadCommitteeFacts;
    card?: typeof cardPath;
  },
): Promise<CommitteeDigestSummary> {
  const now = deps.now ?? new Date();
  const code = deps.code ?? ((u, m) => stopCode(u, m));
  const timeLeft = deps.timeLeft ?? (() => true);
  const weekStart = lastWeekStart(londonDate(now));
  const week = weekKey(weekStart);
  const summary: CommitteeDigestSummary = {
    week,
    mandirs: 0,
    sent: 0,
    failed: 0,
    left: 0,
  };

  const { data, error } = await db.rpc("committee_digests_due", {
    for_week: week,
    week_start: weekStart,
  });
  if (error) {
    summary.error = "The committees couldn't be read.";
    return summary;
  }
  const due = readDueDigests(data);
  for (const [i, item] of due.entries()) {
    if (!timeLeft()) {
      summary.left = due.length - i;
      break;
    }
    const { mandir } = item;
    let sent = 0;
    if (item.recipients.length) {
      const content = await digestContent(db, item, weekStart, site, {
        now,
        loadFacts: deps.loadFacts,
        card: deps.card,
      });
      for (const r of item.recipients) {
        const c = code(r.user_id, mandir.id);
        if (!c) {
          summary.failed++;
          continue;
        }
        const email = committeeDigest({
          ...content,
          stopUrl: stopUrl(site, r.user_id, mandir.id, c),
        });
        const ok = await deps.send(r.email, {
          ...email,
          headers: unsubscribeHeaders(site, r.user_id, mandir.id, c),
        });
        if (ok) sent++;
        else summary.failed++;
      }
      // Every send failed: try again on the next run.
      if (sent === 0) {
        summary.left++;
        continue;
      }
    }
    summary.mandirs++;
    summary.sent += sent;
    await db
      .from("committee_emails_sent")
      .insert({ mandir_id: mandir.id, month: week, recipients: sent });
  }
  await db.from("job_runs").insert({ job: "committee-digest", summary });
  return summary;
}

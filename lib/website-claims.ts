import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  alreadyKnown,
  knownFor,
  type Listed,
  type Waiting,
} from "@/lib/duplicate-check";
import { compareEvents } from "@/lib/duplicates";
import type { CheckResult } from "@/lib/website-check";
import type { FoundEvent } from "@/lib/website-events";

// Puts what a website check found into the review queue, as posters "from
// the mandir's website", so they reach the committee (or Toran) exactly
// like a forwarded poster. Skips anything already listed or queued, and
// records how the check went on the mandir's website source.

const SOURCE = { kind: "crawler", label: "Website check" } as const;

// At most this many new events from one check, so a busy calendar feed
// can't flood the queue.
const MAX_NEW = 20;

// The found events not already known for this mandir (lib/duplicate-check.ts).
export function newEvents(
  found: FoundEvent[],
  known: readonly (Listed | Waiting)[],
): FoundEvent[] {
  const kept: FoundEvent[] = [];
  return found
    .filter((e) => {
      if (alreadyKnown(e, known)) return false;
      // A site listing the same event twice.
      if (kept.some((k) => compareEvents(k, e) === "same")) return false;
      kept.push(e);
      return true;
    })
    .slice(0, MAX_NEW);
}

export async function recordWebsiteCheck(
  db: SupabaseClient<Database>,
  mandir: { id: string; website: string },
  result: CheckResult,
): Promise<{ added: number } | null> {
  const { data: existing } = await db
    .from("sources")
    .select("id")
    .eq("mandir_id", mandir.id)
    .eq("kind", SOURCE.kind)
    .limit(1)
    .maybeSingle();
  let sourceId = existing?.id ?? null;
  if (!sourceId) {
    const { data: created } = await db
      .from("sources")
      .insert({ mandir_id: mandir.id, ...SOURCE, url: mandir.website })
      .select("id")
      .single();
    sourceId = created?.id ?? null;
  }
  if (!sourceId) return null;

  const added = await queueFound(db, mandir, sourceId, result.events);
  if (added === null) return null;

  await db
    .from("sources")
    .update({
      url: mandir.website,
      last_checked_at: new Date().toISOString(),
      last_outcome: result.outcome,
      last_found: result.events.length,
      last_notes: result.notes.join("\n").slice(0, 1000) || null,
      last_documents: result.documents.length
        ? result.documents.slice(0, 5).map((d) => ({
            url: d.url.slice(0, 500),
            kind: d.kind,
            label: d.label.slice(0, 80),
          }))
        : null,
    })
    .eq("id", sourceId);
  return { added };
}

// The mandir websites checked longest ago, never-checked first.
export async function websiteQueue(
  db: SupabaseClient<Database>,
  limit: number,
): Promise<{ id: string; website: string }[]> {
  const [{ data: mandirs }, { data: sources }] = await Promise.all([
    db
      .from("mandirs")
      .select("id, website")
      .not("website", "is", null)
      .neq("status", "hidden"),
    db
      .from("sources")
      .select("mandir_id, last_checked_at")
      .eq("kind", SOURCE.kind),
  ]);
  const lastChecked = new Map(
    (sources ?? []).map((s) => [s.mandir_id, s.last_checked_at ?? ""]),
  );
  return (mandirs ?? [])
    .flatMap((m) => (m.website ? [{ id: m.id, website: m.website }] : []))
    .sort((a, b) =>
      (lastChecked.get(a.id) ?? "").localeCompare(lastChecked.get(b.id) ?? ""),
    )
    .slice(0, limit);
}

// Found events not already listed or waiting go into the review queue as
// "from the mandir's website" claims. How many were added, or null if
// saving failed.
async function queueFound(
  db: SupabaseClient<Database>,
  mandir: { id: string; website: string },
  sourceId: string,
  events: FoundEvent[],
): Promise<number | null> {
  if (!events.length) return 0;
  const known = (await knownFor(db, [mandir.id])).get(mandir.id) ?? [];
  const fresh = newEvents(events, known);
  if (!fresh.length) return 0;
  const { error } = await db.from("event_claims").insert(
    fresh.map((e) => ({
      mandir_id: mandir.id,
      source_id: sourceId,
      proposed: {
        title: e.title,
        date: e.date,
        time: e.time,
        summary: e.summary,
        kind: e.kind,
        repeat: "none",
        until: "",
        from: "website",
        link: e.link.length <= 300 ? e.link : mandir.website,
      },
      // Read from the mandir's own structured data: likely right, but
      // still checked by a person before it's published.
      confidence: 0.8,
    })),
  );
  return error ? null : fresh.length;
}

const CALENDAR = { kind: "website", label: "Events calendar" } as const;

// An event's own link from a calendar, if it has one that's safe to show.
// Calendars give their own address when an event has no link, and a
// calendar's address can be private, so links into the calendar itself
// (or any Google or Outlook calendar address) are dropped.
export function publicLink(link: string, calendarUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (link === calendarUrl || /\.ics(\?|$)/i.test(parsed.pathname)) return null;
  if (
    parsed.hostname === "calendar.google.com" ||
    /(^|\.)outlook\.(live|office|office365)\.com$/.test(parsed.hostname)
  ) {
    return null;
  }
  return link;
}

// Puts what a mandir's own events calendar holds into the review queue
// (lib/website-check.ts readCalendar), and records how the read went on
// the calendar's row, where the committee sees it. The calendar's address
// stays only there: it can be private.
export async function recordCalendarRead(
  db: SupabaseClient<Database>,
  calendar: { mandir_id: string; url: string; website: string | null },
  result: CheckResult,
): Promise<{ added: number } | null> {
  const { data: existing } = await db
    .from("sources")
    .select("id")
    .eq("mandir_id", calendar.mandir_id)
    .eq("kind", CALENDAR.kind)
    .eq("label", CALENDAR.label)
    .limit(1)
    .maybeSingle();
  let sourceId = existing?.id ?? null;
  if (!sourceId) {
    const { data: created } = await db
      .from("sources")
      .insert({ mandir_id: calendar.mandir_id, ...CALENDAR })
      .select("id")
      .single();
    sourceId = created?.id ?? null;
  }
  if (!sourceId) return null;

  const added = await queueFound(
    db,
    // Events without a link of their own point at the mandir's website,
    // or its page on Toran.
    {
      id: calendar.mandir_id,
      website: calendar.website ?? "",
    },
    sourceId,
    result.events.map((e) => ({
      ...e,
      link: publicLink(e.link, calendar.url) ?? calendar.website ?? "",
    })),
  );
  if (added === null) return null;
  const now = new Date().toISOString();
  await Promise.all([
    db
      .from("mandir_calendars")
      .update({
        last_read_at: now,
        last_outcome: result.outcome,
        last_found: result.events.length,
        last_added: added,
      })
      .eq("mandir_id", calendar.mandir_id),
    db
      .from("sources")
      .update({
        last_checked_at: now,
        last_outcome: result.outcome,
        last_found: result.events.length,
      })
      .eq("id", sourceId),
  ]);
  return { added };
}

// Every mandir calendar to read tonight, read longest ago first.
export async function calendarQueue(
  db: SupabaseClient<Database>,
  limit: number,
): Promise<{ mandir_id: string; url: string; website: string | null }[]> {
  const { data } = await db
    .from("mandir_calendars")
    .select(
      "mandir_id, url, last_read_at, mandir:mandirs!inner (website, status)",
    )
    .neq("mandir.status", "hidden")
    .order("last_read_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  return (data ?? []).map((c) => ({
    mandir_id: c.mandir_id,
    url: c.url,
    website: c.mandir.website,
  }));
}

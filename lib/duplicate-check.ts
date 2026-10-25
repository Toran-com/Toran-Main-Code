import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { type Comparable, duplicatesOf, type Match } from "@/lib/duplicates";
import {
  type CheckedEvent,
  type EventInput,
  eventInputFrom,
} from "@/lib/event-form";
import { upcomingFilter } from "@/lib/events";
import { londonDate, londonTime } from "@/lib/london";
import { posterFrom } from "@/lib/posters";

// Keeping one copy of each event (lib/duplicates.ts has the rules): what a
// mandir already has, to compare with something new, and the database
// steps that fold one copy into another or remember that two look-alikes
// are different. Every way an event reaches Toran goes through these:
// committees adding and editing, the review queue, the bulk import, the
// website checker; the database refuses an exact copy whichever way it
// comes (supabase/migrations/20261023100000_duplicate_guard.sql).

type Db = SupabaseClient<Database>;

export type Listed = Comparable & {
  kind: "event";
  id: string;
  time: string;
  cancelled: boolean;
};

export type Waiting = Comparable & {
  kind: "queue";
  id: string;
  time: string;
  // Discarded items count too, so what a reviewer threw out doesn't come
  // back with the next website check.
  discarded: boolean;
};

const timeOf = (at: string, allDay: boolean) =>
  allDay ? "" : londonTime(new Date(at));

// The events at these mandirs from a day on, one entry per date they
// happen on (a repeating event once per date), with their start times.
export async function listedEvents(
  db: Db,
  mandirIds: string[],
  from: string = londonDate(),
): Promise<Map<string, Listed[]>> {
  const byMandir = new Map<string, Listed[]>();
  if (!mandirIds.length) return byMandir;
  const since = `${from}T00:00:00Z`;
  const { data } = await db
    .from("events")
    .select(
      "id, mandir_id, title, starts_at, all_day, status, recurrence, event_occurrences (starts_at, cancelled)",
    )
    .in("mandir_id", mandirIds)
    .in("status", ["published", "draft", "cancelled"])
    .or(upcomingFilter(since))
    .gte("event_occurrences.starts_at", since)
    .limit(2000);
  for (const e of data ?? []) {
    const dates = e.recurrence
      ? e.event_occurrences.filter((o) => !o.cancelled).map((o) => o.starts_at)
      : [e.starts_at];
    const list = byMandir.get(e.mandir_id) ?? [];
    for (const at of dates) {
      list.push({
        kind: "event",
        id: e.id,
        title: e.title,
        date: londonDate(new Date(at)),
        time: timeOf(at, e.all_day),
        cancelled: e.status === "cancelled",
      });
    }
    byMandir.set(e.mandir_id, list);
  }
  return byMandir;
}

// What's waiting in the review queue for these mandirs, and what was
// discarded from it.
export async function waitingEvents(
  db: Db,
  mandirIds: string[],
): Promise<Map<string, Waiting[]>> {
  const byMandir = new Map<string, Waiting[]>();
  if (!mandirIds.length) return byMandir;
  const { data } = await db
    .from("event_claims")
    .select("id, mandir_id, status, proposed")
    .in("mandir_id", mandirIds)
    .in("status", ["pending", "rejected"])
    .limit(5000);
  for (const c of data ?? []) {
    const p = posterFrom(c.proposed) ?? looseProposal(c.proposed);
    if (!p) continue;
    const list = byMandir.get(c.mandir_id) ?? [];
    list.push({
      kind: "queue",
      id: c.id,
      title: p.title,
      date: p.date,
      time: p.time,
      discarded: c.status === "rejected",
    });
    byMandir.set(c.mandir_id, list);
  }
  return byMandir;
}

// Older claims (from the website checker) that don't carry every field.
function looseProposal(
  proposed: unknown,
): { title: string; date: string; time: string } | null {
  const p = proposed as Record<string, unknown> | null;
  return p && typeof p.title === "string" && typeof p.date === "string"
    ? {
        title: p.title,
        date: p.date,
        time: typeof p.time === "string" ? p.time : "",
      }
    : null;
}

// The pairs of these events a person has said are different.
export async function keptApart(db: Db, eventIds: string[]) {
  const apart = new Set<string>();
  if (!eventIds.length) return apart;
  const ids = [...new Set(eventIds)];
  const { data } = await db
    .from("distinct_events")
    .select("first_id, second_id")
    .or(`first_id.in.(${ids.join(",")}),second_id.in.(${ids.join(",")})`)
    .limit(5000);
  for (const d of data ?? []) apart.add(pairKey(d.first_id, d.second_id));
  return apart;
}

export const pairKey = (a: string, b: string) =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

// Records that a new event is different from look-alikes already listed.
export async function keepApart(db: Db, eventId: string, others: string[]) {
  const rows = [...new Set(others)]
    .filter((o) => o !== eventId)
    .map((o) =>
      eventId < o
        ? { first_id: eventId, second_id: o }
        : { first_id: o, second_id: eventId },
    );
  if (!rows.length) return true;
  const { error } = await db
    .from("distinct_events")
    .upsert(rows, { ignoreDuplicates: true });
  return !error;
}

// Something about to be added, in the terms the rules compare.
export function comparableInput(input: EventInput): Comparable {
  return { title: input.title, date: input.date, time: input.time };
}

export function comparableEvent(event: CheckedEvent): Comparable {
  return {
    title: event.title,
    date: londonDate(event.startsAt),
    time: event.allDay ? "" : londonTime(event.startsAt),
  };
}

// The listed events (and, optionally, queue items) the new one may be a
// copy of, surest first, leaving out any a person has kept apart from it.
export function matchesFor<C extends Listed | Waiting>(
  item: Comparable,
  candidates: readonly C[],
  { itself = "", apart = new Set<string>() } = {},
): Match<C>[] {
  const seen = new Set<string>();
  return duplicatesOf({ ...item, id: itself }, candidates).filter((m) => {
    if (m.kind === "event" && itself && apart.has(pairKey(itself, m.id))) {
      return false;
    }
    // A repeating event matches once.
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// Adds what a new copy says to the event already listed, without changing
// anything it already says.
export async function fillGaps(
  db: Db,
  eventId: string,
  event: CheckedEvent,
  link: string | null = null,
): Promise<boolean> {
  const { error } = await db.rpc("fill_event_gaps", {
    target: eventId,
    details: {
      summary: event.summary ?? "",
      title_gu: event.titleGu ?? "",
      summary_gu: event.summaryGu ?? "",
      link: link ?? "",
      kind: event.kind,
      starts_at: event.startsAt.toISOString(),
      all_day: event.allDay,
    },
  });
  return !error;
}

// Folds one listed copy into another (supabase merge_events).
export async function mergeEvents(
  db: Db,
  keep: string,
  other: string,
): Promise<"ok" | "seva" | "failed"> {
  const { error } = await db.rpc("merge_events", { keep, other });
  if (!error) return "ok";
  return error.code === "55000" ? "seva" : "failed";
}

// The database's "already listed" answer (refuse_duplicate_event), with
// the event it matched.
export function duplicateFrom(
  error: {
    code?: string;
    hint?: string;
  } | null,
): string | null {
  return error?.code === "23505" &&
    error.hint &&
    /^[0-9a-f-]{36}$/.test(error.hint)
    ? error.hint
    : null;
}

// Everything a mandir already has, for checking new arrivals against:
// events listed, and items waiting or discarded in the review queue.
export async function knownFor(
  db: Db,
  mandirIds: string[],
): Promise<Map<string, (Listed | Waiting)[]>> {
  const [listed, waiting] = await Promise.all([
    listedEvents(db, mandirIds),
    waitingEvents(db, mandirIds),
  ]);
  return new Map(
    mandirIds.map((id) => [
      id,
      [...(listed.get(id) ?? []), ...(waiting.get(id) ?? [])],
    ]),
  );
}

// Whether something new is surely a copy of what's known: then it isn't
// queued again. (A possible copy is queued, for a person to decide.)
export function alreadyKnown(
  item: Comparable,
  known: readonly (Listed | Waiting)[] = [],
): boolean {
  return matchesFor(item, known).some((m) => m.verdict === "same");
}

// What was typed into an event form, carried in the address when the form
// is sent back with a question (is this the event already listed?), so
// nothing has to be typed again.
export function draftParam(input: EventInput): string {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function draftFrom(value: unknown): EventInput | null {
  if (typeof value !== "string" || !value || value.length > 4000) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    return eventInputFrom({
      get: (name: string) => {
        const v = (parsed as Record<string, unknown>)?.[name];
        return typeof v === "string" ? v.slice(0, 1000) : "";
      },
    });
  } catch {
    return null;
  }
}

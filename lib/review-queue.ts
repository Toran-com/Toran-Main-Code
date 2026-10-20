import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { type Candidate, duplicatesOf } from "@/lib/duplicates";
import { upcomingFilter } from "@/lib/events";
import { londonDate } from "@/lib/london";
import { type Poster, type PosterSource } from "@/lib/posters";

// What's waiting for review, whoever reviews it (Toran on /ops/posters, a
// committee on its own page), with a warning when an item looks like an
// event already on the page or another item in the queue.

export type SourceGroup = "poster" | "visitor" | "website";

export const SOURCE_GROUPS: Record<SourceGroup, string> = {
  poster: "Typed-up posters",
  visitor: "From visitors",
  website: "From websites",
};

export function sourceGroup(from: PosterSource): SourceGroup {
  return from === "visitor"
    ? "visitor"
    : from === "website"
      ? "website"
      : "poster";
}

export type Duplicate = { kind: "event" | "queue"; id: string; title: string };

// Upcoming events at these mandirs, one candidate per date they happen
// on (repeating events once per occurrence), to compare the queue with.
export async function eventCandidates(
  db: SupabaseClient<Database>,
  mandirIds: string[],
  today: string = londonDate(),
): Promise<Map<string, Candidate[]>> {
  const byMandir = new Map<string, Candidate[]>();
  if (!mandirIds.length) return byMandir;
  const from = `${today}T00:00:00Z`;
  const { data } = await db
    .from("events")
    .select(
      "id, mandir_id, title, starts_at, recurrence, event_occurrences (starts_at, cancelled)",
    )
    .in("mandir_id", mandirIds)
    .in("status", ["published", "draft"])
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from)
    .limit(1000);
  for (const e of data ?? []) {
    const starts = e.recurrence
      ? e.event_occurrences.filter((o) => !o.cancelled).map((o) => o.starts_at)
      : [e.starts_at];
    const list = byMandir.get(e.mandir_id) ?? [];
    for (const at of starts) {
      list.push({
        kind: "event",
        id: e.id,
        title: e.title,
        date: londonDate(new Date(at)),
      });
    }
    byMandir.set(e.mandir_id, list);
  }
  return byMandir;
}

// Each item's look-alikes: events at its mandir on the same day, and other
// items in the queue for the same mandir and day. An event is named once
// however many of its dates match.
export function withDuplicates<
  T extends { id: string; mandirId: string; poster: Poster },
>(
  items: readonly T[],
  events: Map<string, Candidate[]>,
): (T & { duplicates: Duplicate[] })[] {
  return items.map((item) => {
    const queue: Candidate[] = items
      .filter((other) => other.mandirId === item.mandirId)
      .map((other) => ({
        kind: "queue",
        id: other.id,
        title: other.poster.title,
        date: other.poster.date,
      }));
    const found = duplicatesOf(
      { id: item.id, title: item.poster.title, date: item.poster.date },
      [...(events.get(item.mandirId) ?? []), ...queue],
    );
    const seen = new Set<string>();
    const duplicates = found.flatMap((c) => {
      if (seen.has(c.id)) return [];
      seen.add(c.id);
      return [{ kind: c.kind, id: c.id, title: c.title }];
    });
    return { ...item, duplicates };
  });
}

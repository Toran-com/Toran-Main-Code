import { cacheLife, cacheTag } from "next/cache";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { londonDate } from "@/lib/format";
import { lookupPostcode, type Position } from "@/lib/geo";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Loaded } from "@/lib/directory";

// Upcoming events across every visible mandir, for "What's on" and the
// festival pages. Public data read as a visitor, cached and shared; any
// change to an event or mandir refreshes it (tag "events").

export type ListedEvent = {
  id: string;
  title: string;
  title_gu: string | null;
  summary: string | null;
  kind: string;
  confirmed_at: string | null;
  origin: string | null;
  all_day: boolean;
  status: string;
  recurrence: string | null;
  link: string | null;
  next_starts_at: string;
  mandir: {
    slug: string;
    name: string;
    town: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
  };
};

const WEEKS_AHEAD = 8;

export async function listUpcomingEvents(): Promise<Loaded<ListedEvent[]>> {
  "use cache";
  cacheTag("events", "mandirs");
  let db;
  try {
    db = createPublicServerClient();
  } catch {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  if (!db) {
    cacheLife("hours");
    return { state: "not connected" };
  }
  const from = `${londonDate()}T00:00:00Z`;
  const to = new Date(
    Date.parse(from) + WEEKS_AHEAD * 7 * 86_400_000,
  ).toISOString();
  const { data, error } = await db
    .from("events")
    .select(
      "id, title, title_gu, summary, kind, confirmed_at, origin, starts_at, all_day, status, recurrence, link, mandir:mandirs!inner (slug, name, town, region, latitude, longitude), event_occurrences (starts_at, cancelled)",
    )
    .in("status", ["published", "cancelled"])
    .or(upcomingFilter(from))
    .lte("starts_at", to)
    .gte("event_occurrences.starts_at", from)
    .lte("event_occurrences.starts_at", to)
    .order("starts_at")
    .limit(1000);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  const events = withNextStart(data, from)
    .filter((e) => e.next_starts_at <= to)
    .map(({ event_occurrences, starts_at, ...e }) => e);
  return { state: "ok", data: events };
}

// Particular events, still to come, however far ahead: a family's plan
// (lib/plan.ts). Cached for these ids; any change to an event or mandir
// refreshes it.
export async function listEventsById(
  ids: string[],
): Promise<Loaded<ListedEvent[]>> {
  "use cache";
  cacheTag("events", "mandirs");
  let db;
  try {
    db = createPublicServerClient();
  } catch {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  if (!db) {
    cacheLife("hours");
    return { state: "not connected" };
  }
  if (!ids.length) return { state: "ok", data: [] };
  const from = `${londonDate()}T00:00:00Z`;
  const { data, error } = await db
    .from("events")
    .select(
      "id, title, title_gu, summary, kind, confirmed_at, origin, starts_at, all_day, status, recurrence, link, mandir:mandirs!inner (slug, name, town, region, latitude, longitude), event_occurrences (starts_at, cancelled)",
    )
    .in("id", ids)
    .in("status", ["published", "cancelled"])
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  return {
    state: "ok",
    data: withNextStart(data, from).map(
      ({ event_occurrences, starts_at, ...e }) => e,
    ),
  };
}

// A visitor's typed postcode or district, as a map position. Cached by
// postcode only (never linked to a person) so repeat searches are quick.
export async function positionForSearch(
  postcode: string,
): Promise<Position | null | "unavailable"> {
  "use cache";
  try {
    const found = await lookupPostcode(postcode);
    cacheLife("days");
    return found;
  } catch {
    cacheLife("minutes");
    return "unavailable";
  }
}

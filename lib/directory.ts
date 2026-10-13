import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/database.types";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { londonDate } from "@/lib/format";
import { createPublicServerClient } from "@/lib/supabase/server";

// Reads the public directory: mandirs, their upcoming events and festival
// dates. Everything here is public information, read as a visitor would
// (the anon role), so results are cached and shared by every visitor.
// Admin changes refresh them by tag (mandirs, mandir:<slug>, festivals).

export type Loaded<T> =
  | { state: "ok"; data: T }
  | { state: "not connected" }
  | { state: "unavailable" };

const notConnected = { state: "not connected" } as const;
const unavailable = { state: "unavailable" } as const;

function connect() {
  try {
    return createPublicServerClient();
  } catch {
    return "misconfigured" as const;
  }
}

// Failures are cached for a minute so the page recovers on its own; good
// answers for an hour.
function settle<T>(result: Loaded<T>): Loaded<T> {
  if (result.state === "unavailable") cacheLife("minutes");
  else cacheLife("hours");
  return result;
}

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type MandirSummary = Pick<
  Row<"mandirs">,
  "slug" | "name" | "town" | "region" | "tradition" | "status"
>;

export type MandirEvent = Pick<
  Row<"events">,
  | "id"
  | "title"
  | "kind"
  | "summary"
  | "starts_at"
  | "ends_at"
  | "all_day"
  | "location_note"
  | "cost_note"
  | "link"
  | "status"
  | "confirmed_at"
  | "recurrence"
> & { next_starts_at: string };

export type MandirDetails = Pick<
  Row<"mandirs">,
  | "id"
  | "slug"
  | "name"
  | "town"
  | "region"
  | "postcode"
  | "tradition"
  | "calendar"
  | "website"
  | "phone"
  | "charity_number"
  | "status"
> & { events: MandirEvent[] };

export type FestivalDate = Pick<
  Row<"festival_dates">,
  "id" | "calendar" | "starts_on" | "ends_on" | "verified" | "source"
> & { festival: Pick<Row<"festivals">, "slug" | "name" | "summary"> | null };

export async function listMandirs(): Promise<Loaded<MandirSummary[]>> {
  "use cache";
  cacheTag("mandirs");
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("mandirs")
    .select("slug, name, town, region, tradition, status")
    .order("name");
  return settle(error ? unavailable : { state: "ok", data });
}

export async function getMandir(
  slug: string,
): Promise<Loaded<MandirDetails | null>> {
  "use cache";
  cacheTag("mandirs", `mandir:${slug}`);
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);

  const { data: mandir, error } = await db
    .from("mandirs")
    .select(
      "id, slug, name, town, region, postcode, tradition, calendar, website, phone, charity_number, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) return settle<never>(unavailable);
  if (!mandir) return settle({ state: "ok", data: null });

  // Events from the start of today (UK) onwards, repeating ones by their
  // next date. Cached for an hour, so an event can linger up to an hour
  // after its day ends.
  const from = `${londonDate()}T00:00:00Z`;
  const { data: rows, error: eventsError } = await db
    .from("events")
    .select(
      "id, title, kind, summary, starts_at, ends_at, all_day, location_note, cost_note, link, status, confirmed_at, recurrence, event_occurrences (starts_at, cancelled)",
    )
    .eq("mandir_id", mandir.id)
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from)
    .order("starts_at")
    .limit(100);
  if (eventsError) return settle<never>(unavailable);

  const events = withNextStart(rows, from).slice(0, 50);
  return settle({ state: "ok", data: { ...mandir, events } });
}

export async function listFestivalDates(): Promise<Loaded<FestivalDate[]>> {
  "use cache";
  cacheTag("festivals");
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("festival_dates")
    .select(
      "id, calendar, starts_on, ends_on, verified, source, festival:festivals (slug, name, summary)",
    )
    .gte("ends_on", londonDate())
    .order("starts_on")
    .order("calendar", { nullsFirst: true });
  return settle(error ? unavailable : { state: "ok", data });
}

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
  | "slug"
  | "name"
  | "town"
  | "region"
  | "tradition"
  | "status"
  | "latitude"
  | "longitude"
  | "opening_hours"
>;

export type MandirEvent = Pick<
  Row<"events">,
  | "id"
  | "title"
  | "title_gu"
  | "kind"
  | "summary"
  | "summary_gu"
  | "starts_at"
  | "ends_at"
  | "all_day"
  | "location_note"
  | "cost_note"
  | "tickets_needed"
  | "tickets_url"
  | "venue_name"
  | "venue_postcode"
  | "link"
  | "status"
  | "confirmed_at"
  | "recurrence"
  | "origin"
  | "languages"
> & {
  next_starts_at: string;
  // Dates of a repeating event from today on (for calendar files).
  event_occurrences?: { starts_at: string; cancelled: boolean }[] | null;
};

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
  | "live_url"
  | "phone"
  | "photo_path"
  | "charity_number"
  | "status"
  | "latitude"
  | "longitude"
  | "getting_there"
  | "facilities"
  | "visiting_note"
  | "opening_hours"
  | "aarti_times"
> & {
  events: MandirEvent[];
  // Notices from the committee to visitors, until their last day.
  notices?: MandirNotice[];
};

export type MandirNotice = Pick<
  Row<"mandir_notices">,
  "id" | "body" | "until_on"
> & {
  // Its last day is today (worked out with the page's data, as pages
  // can't read the clock while they're drawn).
  endsToday?: boolean;
};

// A mandir's current notices, newest first (at most three can be current).
async function currentNotices(
  db: Exclude<ReturnType<typeof connect>, null | "misconfigured">,
  mandirId: string,
): Promise<MandirNotice[]> {
  const today = londonDate();
  const { data } = await db
    .from("mandir_notices")
    .select("id, body, until_on")
    .eq("mandir_id", mandirId)
    .gte("until_on", today)
    .order("created_at", { ascending: false })
    .limit(3);
  return (data ?? []).map((n) => ({ ...n, endsToday: n.until_on === today }));
}

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
    .select(
      "slug, name, town, region, tradition, status, latitude, longitude, opening_hours",
    )
    .order("name");
  return settle(error ? unavailable : { state: "ok", data });
}

const MANDIR_COLUMNS =
  "id, slug, name, town, region, postcode, tradition, calendar, website, live_url, phone, photo_path, charity_number, status, latitude, longitude, getting_there, facilities, visiting_note, opening_hours, aarti_times";
const EVENT_COLUMNS =
  "id, title, title_gu, kind, summary, summary_gu, starts_at, ends_at, all_day, location_note, cost_note, tickets_needed, tickets_url, venue_name, venue_postcode, link, status, confirmed_at, recurrence, origin, languages, event_occurrences (starts_at, cancelled)";

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
    .select(MANDIR_COLUMNS)
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
    .select(EVENT_COLUMNS)
    .eq("mandir_id", mandir.id)
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from)
    .order("starts_at")
    .limit(100);
  if (eventsError) return settle<never>(unavailable);

  // The daily aarti (lib/aarti-events.ts) is in the mandir's opening
  // times on its page, so not listed again among its events.
  const events = withNextStart(
    rows.filter((e) => e.origin !== "aarti"),
    from,
  ).slice(0, 50);
  const notices = await currentNotices(db, mandir.id);
  return settle({ state: "ok", data: { ...mandir, events, notices } });
}

export type MandirEventPage = {
  mandir: Omit<MandirDetails, "events">;
  event: MandirEvent;
  // False once the event (or every date of a repeating one) has passed.
  upcoming: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One event and its mandir, for the event's own page. Past events are
// found too, so an old shared link still explains what happened; an id
// that isn't an event of this mandir is null.
export async function getMandirEvent(
  slug: string,
  id: string,
): Promise<Loaded<MandirEventPage | null>> {
  "use cache";
  cacheTag("mandirs", `mandir:${slug}`);
  if (!UUID.test(id)) return settle({ state: "ok", data: null });
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);

  const { data: mandir, error } = await db
    .from("mandirs")
    .select(MANDIR_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) return settle<never>(unavailable);
  if (!mandir) return settle({ state: "ok", data: null });

  const from = `${londonDate()}T00:00:00Z`;
  const { data: row, error: eventError } = await db
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("mandir_id", mandir.id)
    .eq("id", id)
    .gte("event_occurrences.starts_at", from)
    .maybeSingle();
  if (eventError) return settle<never>(unavailable);
  if (!row) return settle({ state: "ok", data: null });

  const [next] = withNextStart([row], from);
  const event = next ?? { ...row, next_starts_at: row.starts_at };
  const notices = await currentNotices(db, mandir.id);
  return settle({
    state: "ok",
    data: { mandir: { ...mandir, notices }, event, upcoming: Boolean(next) },
  });
}

export type SevaShift = Pick<
  Row<"seva_shifts">,
  "id" | "starts_at" | "ends_at" | "needed" | "filled_offline" | "taken_online"
>;
export type SevaRole = Pick<
  Row<"seva_roles">,
  "id" | "name" | "description" | "needs_dbs" | "open"
> & { shifts: SevaShift[] };
// `open`: whether any of it can be taken on Toran.
export type EventSeva = { open: boolean; roles: SevaRole[] };

const SEVA_COLUMNS =
  "id, name, description, needs_dbs, open, created_at, mandir:mandirs!inner (slug), seva_shifts (id, starts_at, ends_at, needed, filled_offline, taken_online)";

function sevaRoles(
  rows: {
    id: string;
    name: string;
    description: string | null;
    needs_dbs: boolean;
    open: boolean;
    created_at: string;
    seva_shifts: SevaShift[];
  }[],
): SevaRole[] {
  return [...rows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      needs_dbs: r.needs_dbs,
      open: r.open,
      shifts: [...r.seva_shifts].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      ),
    }));
}

// An event's seva, with how many places are taken, for its public seva
// page. Refreshed with the mandir's other pages when the committee
// changes it or a volunteer takes a slot.
export async function getEventSeva(
  slug: string,
  eventId: string,
): Promise<Loaded<EventSeva | null>> {
  "use cache";
  cacheTag("mandirs", `mandir:${slug}`);
  if (!UUID.test(eventId)) return settle({ state: "ok", data: null });
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("seva_roles")
    .select(SEVA_COLUMNS)
    .eq("event_id", eventId)
    .eq("mandir.slug", slug);
  if (error) return settle<never>(unavailable);
  const roles = sevaRoles(data);
  return settle({
    state: "ok",
    data: { open: roles.some((r) => r.open), roles },
  });
}

// A seva that isn't for an event, for its own public page. `eventId` is
// set when it has since been linked to an event, whose seva page it's on;
// `upcoming` is false once every shift has ended.
export async function getOwnSeva(
  slug: string,
  sevaId: string,
): Promise<
  Loaded<{ role: SevaRole; eventId: string | null; upcoming: boolean } | null>
> {
  "use cache";
  cacheTag("mandirs", `mandir:${slug}`);
  if (!UUID.test(sevaId)) return settle({ state: "ok", data: null });
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("seva_roles")
    .select(`event_id, ${SEVA_COLUMNS}`)
    .eq("id", sevaId)
    .eq("mandir.slug", slug)
    .maybeSingle();
  if (error) return settle<never>(unavailable);
  if (!data) return settle({ state: "ok", data: null });
  const [role] = sevaRoles([data]);
  const now = new Date().toISOString();
  return settle({
    state: "ok",
    data: {
      role,
      eventId: data.event_id,
      upcoming: role.shifts.some((s) => s.ends_at > now),
    },
  });
}

// Seva on its own that volunteers can take, at every mandir, for its
// pages' static params.
export async function listOwnSeva(): Promise<
  Loaded<{ id: string; slug: string }[]>
> {
  "use cache";
  cacheTag("mandirs", "seva");
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("seva_roles")
    .select("id, mandir:mandirs!inner (slug)")
    .is("event_id", null)
    .eq("open", true)
    .limit(1000);
  if (error) return settle<never>(unavailable);
  return settle({
    state: "ok",
    data: data.map((r) => ({ id: r.id, slug: r.mandir.slug })),
  });
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

export type FestivalWithDates = {
  slug: string;
  name: string;
  summary: string | null;
  dates: Pick<
    Row<"festival_dates">,
    "id" | "calendar" | "starts_on" | "ends_on" | "verified"
  >[];
};

export async function listFestivals(): Promise<
  Loaded<Pick<Row<"festivals">, "slug" | "name">[]>
> {
  "use cache";
  cacheTag("festivals");
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data, error } = await db
    .from("festivals")
    .select("slug, name")
    .order("name");
  return settle(error ? unavailable : { state: "ok", data });
}

// One festival with its upcoming dates (any calendar).
export async function getFestival(
  slug: string,
): Promise<Loaded<FestivalWithDates | null>> {
  "use cache";
  cacheTag("festivals", `festival:${slug}`);
  const db = connect();
  if (db === null) return settle<never>(notConnected);
  if (db === "misconfigured") return settle<never>(unavailable);
  const { data: festival, error } = await db
    .from("festivals")
    .select("id, slug, name, summary")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return settle<never>(unavailable);
  if (!festival) return settle({ state: "ok", data: null });
  const { data: dates, error: datesError } = await db
    .from("festival_dates")
    .select("id, calendar, starts_on, ends_on, verified")
    .eq("festival_id", festival.id)
    .gte("ends_on", londonDate())
    .order("starts_on");
  if (datesError) return settle<never>(unavailable);
  const { id, ...rest } = festival;
  return settle({ state: "ok", data: { ...rest, dates } });
}

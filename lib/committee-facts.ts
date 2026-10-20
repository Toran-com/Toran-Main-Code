import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommitteeFacts } from "@/lib/committee-tasks";
import type { Database } from "@/lib/database.types";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { londonDate } from "@/lib/london";
import { posterFrom } from "@/lib/posters";
import { festivalPicks } from "@/lib/quick-events";
import { placesTaken } from "@/lib/seva";

type Db = SupabaseClient<Database>;

// Seva shifts in the next fortnight with places still free, for the
// committee's to-do list. Shifts that need a DBS check are left out:
// those are filled by the mandir, not shared.
export const SEVA_WITHIN_DAYS = 14;

export async function shortSevaShifts(
  db: Db,
  events: { id: string; title: string }[],
  now: Date = new Date(),
): Promise<CommitteeFacts["shortShifts"]> {
  if (!events.length) return [];
  const until = new Date(now.getTime() + SEVA_WITHIN_DAYS * 86_400_000);
  const { data } = await db
    .from("seva_shifts")
    .select(
      "starts_at, needed, filled_offline, taken_online, role:seva_roles!inner (event_id, needs_dbs)",
    )
    .in(
      "role.event_id",
      events.map((e) => e.id),
    )
    .eq("role.needs_dbs", false)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString())
    .order("starts_at");
  const titles = new Map(events.map((e) => [e.id, e.title]));
  return (data ?? []).flatMap((s) => {
    const free = s.needed - placesTaken(s);
    const eventId = s.role?.event_id;
    return free > 0 && eventId && titles.has(eventId)
      ? [
          {
            eventId,
            eventTitle: titles.get(eventId)!,
            starts_at: s.starts_at,
            free,
          },
        ]
      : [];
  });
}

// Everything committeeTasks needs about one mandir, for the account page.
// The mandir's own page loads most of this already and builds the facts
// itself.
export async function loadCommitteeFacts(
  db: Db,
  mandir: {
    id: string;
    slug: string;
    calendar: string | null;
    postcode: string | null;
    website: string | null;
    phone: string | null;
  },
  now: Date = new Date(),
): Promise<CommitteeFacts> {
  const today = londonDate(now);
  const from = `${today}T00:00:00Z`;
  const [
    { data: rows },
    { data: claims },
    { data: members },
    { data: invites },
    { data: dates },
    { count: eventsEver },
  ] = await Promise.all([
    db
      .from("events")
      .select(
        "id, title, status, confirmed_at, starts_at, recurrence, festival_date_id, event_occurrences (starts_at, cancelled)",
      )
      .eq("mandir_id", mandir.id)
      .neq("status", "removed")
      .or(upcomingFilter(from))
      .gte("event_occurrences.starts_at", from)
      .order("starts_at")
      .limit(100),
    db
      .from("event_claims")
      .select("proposed")
      .eq("mandir_id", mandir.id)
      .eq("status", "pending"),
    db.rpc("committee_members", { target: mandir.id }),
    db
      .from("mandir_invites")
      .select("id")
      .eq("mandir_id", mandir.id)
      .gt("expires_at", now.toISOString()),
    db
      .from("festival_dates")
      .select(
        "id, festival_id, calendar, starts_on, festival:festivals (slug, name)",
      )
      .gte("starts_on", today)
      .order("starts_on"),
    eventCount(db, mandir.id),
  ]);
  const events = withNextStart(rows ?? [], from);
  return {
    slug: mandir.slug,
    today,
    now,
    events,
    posters: (claims ?? []).filter((c) => posterFrom(c.proposed)).length,
    festivals: festivalPicks(dates ?? [], mandir.calendar, events, today).map(
      (p) => ({ title: p.title, date: p.date }),
    ),
    shortShifts: await shortSevaShifts(db, events, now),
    eventsEver: Math.max(eventsEver ?? 0, events.length),
    members: members?.length ?? 1,
    invites: invites?.length ?? 0,
    details: {
      postcode: mandir.postcode,
      website: mandir.website,
      phone: mandir.phone,
    },
  };
}

// How many events a mandir has ever added, so "Add your first event" stays
// ticked once it's done.
export function eventCount(db: Db, mandirId: string) {
  return db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("mandir_id", mandirId);
}

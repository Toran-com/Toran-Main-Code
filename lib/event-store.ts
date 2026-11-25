import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { EventOrigin } from "@/lib/event-kinds";
import type { CheckedEvent } from "@/lib/event-form";
import { duplicateFrom } from "@/lib/duplicate-check";
import { londonDate } from "@/lib/format";

export type SaveResult =
  | { ok: true; id: string }
  // The database refused a copy of an event already listed (the id).
  | { ok: false; duplicate: string | null };

// Saves a checked event and, if it repeats, each of its dates. Row-level
// security decides whether the signed-in person may add it.
// "confirmed" means a mandir admin is adding or approving it themselves;
// the database records who. A copy of an event already listed is refused
// by the database; callers check for look-alikes first
// (lib/duplicate-check.ts).
export async function saveEvent(
  db: SupabaseClient<Database>,
  mandirId: string,
  event: CheckedEvent,
  {
    confirmed,
    link = null,
    origin,
    festivalDateId = null,
  }: {
    confirmed: boolean;
    link?: string | null;
    origin: EventOrigin;
    // The festival date it belongs to, when added from a festival.
    festivalDateId?: string | null;
  },
): Promise<SaveResult> {
  const { data, error } = await db
    .from("events")
    .insert({
      mandir_id: mandirId,
      title: event.title,
      summary: event.summary,
      title_gu: event.titleGu,
      summary_gu: event.summaryGu,
      kind: event.kind,
      origin,
      starts_at: event.startsAt.toISOString(),
      ends_at: event.endsAt?.toISOString() ?? null,
      all_day: event.allDay,
      recurrence: event.rule,
      status: "published",
      confirmed_at: confirmed ? new Date().toISOString() : null,
      link,
      festival_date_id: festivalDateId,
      cost_note: event.costNote,
      tickets_needed: event.ticketsNeeded,
      tickets_url: event.ticketsUrl,
      location_note: event.locationNote,
      venue_name: event.venueName,
      venue_postcode: event.venuePostcode,
      languages: event.languages,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, duplicate: duplicateFrom(error) };

  if (event.occurrences.length) {
    const { error: datesError } = await db.from("event_occurrences").insert(
      event.occurrences.map((at) => ({
        event_id: data.id,
        starts_at: at.toISOString(),
        ends_at: endOf(event, at),
      })),
    );
    if (datesError) {
      // Don't leave a repeating event without its dates.
      await db.from("events").update({ status: "removed" }).eq("id", data.id);
      return { ok: false, duplicate: null };
    }
  }
  return { ok: true, id: data.id };
}

// Changes an event's details and, for a repeating event, its future dates,
// in one step (the edit_event database function). Row-level security
// decides whether the signed-in person may. Dates before today are kept as
// they were.
export async function updateEvent(
  db: SupabaseClient<Database>,
  eventId: string,
  event: CheckedEvent,
): Promise<{ ok: true } | { ok: false; duplicate: string | null }> {
  const { error } = await db.rpc("edit_event", {
    target: eventId,
    details: {
      title: event.title,
      summary: event.summary ?? "",
      title_gu: event.titleGu ?? "",
      summary_gu: event.summaryGu ?? "",
      kind: event.kind,
      starts_at: event.startsAt.toISOString(),
      // Empty clears it; each date's end is its start plus the same
      // length (the edit_event database function).
      ends_at: event.endsAt?.toISOString() ?? "",
      all_day: event.allDay,
      recurrence: event.rule ?? "",
      cost_note: event.costNote ?? "",
      tickets_needed: event.ticketsNeeded,
      tickets_url: event.ticketsUrl ?? "",
      location_note: event.locationNote ?? "",
      venue_name: event.venueName ?? "",
      venue_postcode: event.venuePostcode ?? "",
      languages: event.languages,
    },
    dates: event.occurrences.map((at) => at.toISOString()),
    today: `${londonDate()}T00:00:00Z`,
  });
  return error ? { ok: false, duplicate: duplicateFrom(error) } : { ok: true };
}

// When one date of a repeating event ends: its start plus the first
// date's length, so a 7pm–9pm aarti ends at 9pm every time.
function endOf(event: CheckedEvent, at: Date): string | null {
  if (!event.endsAt) return null;
  const length = event.endsAt.getTime() - event.startsAt.getTime();
  return new Date(at.getTime() + length).toISOString();
}

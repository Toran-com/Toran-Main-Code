import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CheckedEvent } from "@/lib/event-form";
import { londonDate } from "@/lib/format";

// Saves a checked event and, if it repeats, each of its dates. Row-level
// security decides whether the signed-in person may add it.
// "confirmed" means a mandir admin is adding or approving it themselves;
// the database records who.
export async function saveEvent(
  db: SupabaseClient<Database>,
  mandirId: string,
  event: CheckedEvent,
  { confirmed, link = null }: { confirmed: boolean; link?: string | null },
): Promise<string | null> {
  const { data, error } = await db
    .from("events")
    .insert({
      mandir_id: mandirId,
      title: event.title,
      summary: event.summary,
      title_gu: event.titleGu,
      summary_gu: event.summaryGu,
      starts_at: event.startsAt.toISOString(),
      all_day: event.allDay,
      recurrence: event.rule,
      status: "published",
      confirmed_at: confirmed ? new Date().toISOString() : null,
      link,
    })
    .select("id")
    .single();
  if (error || !data) return null;

  if (event.occurrences.length) {
    const { error: datesError } = await db.from("event_occurrences").insert(
      event.occurrences.map((at) => ({
        event_id: data.id,
        starts_at: at.toISOString(),
      })),
    );
    if (datesError) {
      // Don't leave a repeating event without its dates.
      await db.from("events").update({ status: "removed" }).eq("id", data.id);
      return null;
    }
  }
  return data.id;
}

// Changes an event's details and, for a repeating event, its future dates,
// in one step (the edit_event database function). Row-level security
// decides whether the signed-in person may. Dates before today are kept as
// they were.
export async function updateEvent(
  db: SupabaseClient<Database>,
  eventId: string,
  event: CheckedEvent,
): Promise<boolean> {
  const { error } = await db.rpc("edit_event", {
    target: eventId,
    details: {
      title: event.title,
      summary: event.summary ?? "",
      title_gu: event.titleGu ?? "",
      summary_gu: event.summaryGu ?? "",
      starts_at: event.startsAt.toISOString(),
      all_day: event.allDay,
      recurrence: event.rule ?? "",
    },
    dates: event.occurrences.map((at) => at.toISOString()),
    today: `${londonDate()}T00:00:00Z`,
  });
  return !error;
}

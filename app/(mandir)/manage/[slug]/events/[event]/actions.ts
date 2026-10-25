"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  comparableEvent,
  keptApart,
  listedEvents,
  matchesFor,
} from "@/lib/duplicate-check";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { updateEvent } from "@/lib/event-store";
import { londonDate } from "@/lib/london";
import { createSessionClient } from "@/lib/supabase/session";

// Saves changes to an event's details. Row-level security (inside the
// edit_event database function) decides who may.
export async function editEvent(formData: FormData) {
  const slug = encodeURIComponent(String(formData.get("slug") ?? ""));
  const eventId = String(formData.get("event") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${slug}/events/${encodeURIComponent(eventId)}?${query}`);

  const checked = checkEvent(eventInputFrom(formData));
  if (!checked.ok) back(`error=${checked.error}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  // Never two copies: not the same as another event on the page (unless
  // the committee has already said they're different).
  const { data: event } = await supabase
    .from("events")
    .select("mandir_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) back("error=failed");
  const listed =
    (
      await listedEvents(
        supabase,
        [event.mandir_id],
        londonDate(checked.event.startsAt),
      )
    ).get(event.mandir_id) ?? [];
  const others = listed.filter((e) => e.id !== eventId);
  const apart = await keptApart(supabase, [eventId]);
  const copies = matchesFor(comparableEvent(checked.event), others, {
    itself: eventId,
    apart,
  });
  if (copies.some((m) => m.verdict === "same")) back("error=duplicate");
  const saved = await updateEvent(supabase, eventId, checked.event);
  if (!saved.ok) back(saved.duplicate ? "error=duplicate" : "error=failed");
  updateTag(`mandir:${decodeURIComponent(slug)}`);
  updateTag("events");
  redirect(`/manage/${slug}?done=edited`);
}

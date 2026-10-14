"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { updateEvent } from "@/lib/event-store";
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
  if (!(await updateEvent(supabase, eventId, checked.event))) {
    back("error=failed");
  }
  updateTag(`mandir:${decodeURIComponent(slug)}`);
  updateTag("events");
  redirect(`/manage/${slug}?done=edited`);
}

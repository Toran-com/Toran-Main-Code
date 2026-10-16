"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkRole, checkShift } from "@/lib/seva";
import { createSessionClient } from "@/lib/supabase/session";

// Changes to an event's seva rota. Row-level security allows only the
// mandir's admins and Toran admins. The rota is public (the event's seva
// page), so each change refreshes the mandir's pages.

function backTo(formData: FormData): (query: string) => never {
  const rawSlug = String(formData.get("slug") ?? "");
  const slug = encodeURIComponent(rawSlug);
  const event = encodeURIComponent(String(formData.get("event") ?? ""));
  return (query) => {
    if (!query.startsWith("error=")) updateTag(`mandir:${rawSlug}`);
    redirect(`/manage/${slug}/seva/${event}?${query}`);
  };
}

export async function addRole(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const checked = checkRole({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    dbs: formData.get("dbs") === "on",
  });
  if (!checked.ok) back(`error=${checked.error}`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { error } = await supabase
    .from("seva_roles")
    .insert({ event_id: String(formData.get("event")), ...checked.role });
  back(error ? "error=failed" : "done=role");
}

export async function addShift(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const checked = checkShift({
    date: String(formData.get("date") ?? ""),
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    needed: String(formData.get("needed") ?? ""),
  });
  if (!checked.ok) back(`error=${checked.error}`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { error } = await supabase
    .from("seva_shifts")
    .insert({ role_id: String(formData.get("role")), ...checked.shift });
  back(error ? "error=failed" : "done=shift");
}

export async function removeFromRota(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const table = formData.get("kind") === "role" ? "seva_roles" : "seva_shifts";
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .select("id");
  back(error || !data?.length ? "error=failed" : "done=removed");
}

// Lets volunteers take slots on Toran (no names), or stops it.
export async function setSevaOpen(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const open = formData.get("open") === "yes";
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase
    .from("events")
    .update({ seva_open: open })
    .eq("id", String(formData.get("event") ?? ""))
    .select("id");
  back(
    error || !data?.length
      ? "error=failed"
      : `done=${open ? "open" : "closed"}`,
  );
}

// The committee's own count for a shift (people who said yes in WhatsApp
// or in person), one up or down, never past what the shift needs.
export async function changeCount(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const id = String(formData.get("id") ?? "");
  const { data: shift } = await supabase
    .from("seva_shifts")
    .select("needed, filled_offline, taken_online")
    .eq("id", id)
    .maybeSingle();
  if (!shift) back("error=failed");
  const step = formData.get("step") === "down" ? -1 : 1;
  const room = Math.max(shift.needed - shift.taken_online, 0);
  const count = Math.min(Math.max(shift.filled_offline + step, 0), room);
  const { error } = await supabase
    .from("seva_shifts")
    .update({ filled_offline: count })
    .eq("id", id);
  back(error ? "error=failed" : "done=count");
}

// Clears a shift's slots taken on Toran, for example if someone filled the
// rota for a joke.
export async function clearOnlineSlots(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { error } = await supabase
    .from("seva_slots")
    .delete()
    .eq("shift_id", String(formData.get("id") ?? ""));
  back(error ? "error=failed" : "done=cleared");
}

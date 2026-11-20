"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkRole, checkShift } from "@/lib/seva";
import { createSessionClient } from "@/lib/supabase/session";

// Changes to a mandir's seva. Row-level security allows only the mandir's
// admins and Toran admins. Seva is public (its volunteers' page and the
// Seva page), so each change refreshes the mandir's pages.

function backTo(formData: FormData): (query: string) => never {
  const rawSlug = String(formData.get("slug") ?? "");
  const slug = encodeURIComponent(rawSlug);
  return (query) => {
    if (!query.startsWith("error=")) {
      updateTag(`mandir:${rawSlug}`);
      updateTag("seva");
    }
    redirect(`/manage/${slug}/seva?${query}`);
  };
}

// The event a seva is for, or null for seva on its own.
function eventOf(formData: FormData): string | null {
  return String(formData.get("event") ?? "") || null;
}

// A new seva with its first time, and whether volunteers can take places
// on Toran. Optionally for one of the mandir's events.
export async function addSeva(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const role = checkRole({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    dbs: formData.get("dbs") === "on",
  });
  if (!role.ok) back(`error=${role.error}&open=add-seva`);
  const shift = checkShift({
    date: String(formData.get("date") ?? ""),
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    needed: String(formData.get("needed") ?? ""),
  });
  if (!shift.ok) back(`error=${shift.error}&open=add-seva`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: seva, error } = await supabase
    .from("seva_roles")
    .insert({
      mandir_id: String(formData.get("mandir") ?? ""),
      event_id: eventOf(formData),
      open: formData.get("open") === "on",
      ...role.role,
    })
    .select("id")
    .single();
  if (error || !seva) back("error=failed");
  const { error: shiftError } = await supabase
    .from("seva_shifts")
    .insert({ role_id: seva.id, ...shift.shift });
  if (shiftError) {
    // Not half added: without its time, the seva goes too.
    await supabase.from("seva_roles").delete().eq("id", seva.id);
    back("error=failed");
  }
  back("done=added");
}

// A seva's name, what it involves, its DBS check and its event. Its times
// stay as they are.
export async function changeSeva(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const role = checkRole({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    dbs: formData.get("dbs") === "on",
  });
  if (!role.ok) back(`error=${role.error}`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase
    .from("seva_roles")
    .update({ event_id: eventOf(formData), ...role.role })
    .eq("id", String(formData.get("id") ?? ""))
    .select("id");
  back(error || !data?.length ? "error=failed" : "done=changed");
}

// Another time for a seva.
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

export async function removeSeva(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const table = formData.get("kind") === "seva" ? "seva_roles" : "seva_shifts";
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .select("id");
  back(error || !data?.length ? "error=failed" : "done=removed");
}

// Lets volunteers take a seva's places on Toran (no names), or stops it.
export async function setSevaOpen(formData: FormData) {
  const back: (query: string) => never = backTo(formData);
  const open = formData.get("open") === "yes";
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase
    .from("seva_roles")
    .update({ open })
    .eq("id", String(formData.get("id") ?? ""))
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

// Clears a shift's places taken on Toran, for example if someone filled
// the rota for a joke.
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

"use server";

import { redirect } from "next/navigation";
import { checkRole, checkShift } from "@/lib/seva";
import { createSessionClient } from "@/lib/supabase/session";

// Changes to an event's seva rota. Row-level security allows only the
// mandir's admins and Toran admins.

function backTo(formData: FormData): (query: string) => never {
  const slug = encodeURIComponent(String(formData.get("slug") ?? ""));
  const event = encodeURIComponent(String(formData.get("event") ?? ""));
  return (query) => redirect(`/manage/${slug}/seva/${event}?${query}`);
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

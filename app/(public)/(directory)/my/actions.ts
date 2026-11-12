"use server";

import {
  cleanSaved,
  FAMILY_ACCOUNTS,
  type FamilySaved,
} from "@/lib/family-accounts";
import { createSessionClient } from "@/lib/supabase/session";

// Family accounts (decision 0020): the saved lists of whoever is logged
// in, for components/family-sync.tsx. Each family can only reach its own
// row (row level security), and has a row only once it has agreed to
// Toran keeping its lists (the box on My Toran; the database records
// when). Nothing happens while family accounts are switched off.

export type Loaded = { userId: string; saved: FamilySaved | null } | null;

export async function loadFamilySaved(): Promise<Loaded> {
  if (!FAMILY_ACCOUNTS) return null;
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("family_saved")
    .select("following, plan")
    .eq("user_id", user.id)
    .maybeSingle();
  return { userId: user.id, saved: data ? cleanSaved(data) : null };
}

export async function saveFamilySaved(value: FamilySaved): Promise<boolean> {
  if (!FAMILY_ACCOUNTS) return false;
  const supabase = await createSessionClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const saved = cleanSaved(value);
  // Only an account that agreed has a row to change; this never makes one.
  const { error } = await supabase
    .from("family_saved")
    .update({
      following: saved.following,
      plan: saved.plan,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  return !error;
}

// The family ticked the box on My Toran: keep this phone's lists on the
// account from now on. The database refuses a row without consent and
// records the time itself.
export async function agreeToFamilySaving(
  consent: boolean,
  value: FamilySaved,
): Promise<boolean> {
  if (!FAMILY_ACCOUNTS || consent !== true) return false;
  const supabase = await createSessionClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const saved = cleanSaved(value);
  const { error } = await supabase.from("family_saved").insert({
    user_id: user.id,
    following: saved.following,
    plan: saved.plan,
    consented_at: new Date().toISOString(),
  });
  // Already agreed (on another device, say): that's fine too.
  return !error || error.code === "23505";
}

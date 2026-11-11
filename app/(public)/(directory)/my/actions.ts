"use server";

import {
  cleanSaved,
  FAMILY_ACCOUNTS,
  type FamilySaved,
} from "@/lib/family-accounts";
import { createSessionClient } from "@/lib/supabase/session";

// Family accounts (decision 0020): the saved lists of whoever is logged
// in, for components/family-sync.tsx. Each family can only reach its own
// row (row level security). Nothing happens while family accounts are
// switched off.

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
  const { error } = await supabase.from("family_saved").upsert({
    user_id: user.id,
    following: saved.following,
    plan: saved.plan,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

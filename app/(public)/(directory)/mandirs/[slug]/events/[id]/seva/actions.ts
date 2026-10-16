"use server";

import { updateTag } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/server";

// Taking and giving back a seva slot, as a visitor (no login, no name).
// The database decides whether the slot can be taken (decision 0013); the
// mandir's pages are refreshed so the counts are right for the next person.

export type TakeResult =
  | { ok: true; slot: string; shift: string }
  | { ok: false; shift: string; error: "full" | "closed" | "failed" }
  | null;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function refresh(slug: string) {
  if (SLUG.test(slug)) updateTag(`mandir:${slug}`);
}

export async function takeSlot(
  _previous: TakeResult,
  formData: FormData,
): Promise<TakeResult> {
  const shift = String(formData.get("shift") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const db = createPublicServerClient();
  if (!db) return { ok: false, shift, error: "failed" };
  const { data, error } = await db.rpc("take_seva_slot", {
    target_shift: shift,
  });
  if (error || !data) {
    const reason =
      error?.message === "full" || error?.message === "closed"
        ? error.message
        : "failed";
    if (reason !== "failed") refresh(slug);
    return { ok: false, shift, error: reason };
  }
  refresh(slug);
  return { ok: true, slot: data, shift };
}

export async function giveBackSlot(
  slot: string,
  slug: string,
): Promise<boolean> {
  const db = createPublicServerClient();
  if (!db) return false;
  const { data, error } = await db.rpc("give_back_seva_slot", { slot });
  if (error) return false;
  refresh(slug);
  return data === true;
}

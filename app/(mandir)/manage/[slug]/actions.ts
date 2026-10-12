"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { londonDate, londonToUtc } from "@/lib/format";
import { createSessionClient } from "@/lib/supabase/session";

// Changes a mandir admin makes to their mandir's events. The database's
// row-level security decides who may change what; these actions check the
// form and refresh the public pages afterwards.

const DAY_MS = 86_400_000;

export async function addEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const back = (query: string) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  if (title.length < 2 || title.length > 120) back("error=title");
  if (summary.length > 280) back("error=summary");
  const today = londonDate();
  const latest = londonDate(new Date(Date.now() + 2 * 366 * DAY_MS));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > latest) {
    back("error=date");
  }
  const allDay = time === "";
  const startsAt = londonToUtc(date, allDay ? "00:00" : time);
  if (!startsAt) back(allDay ? "error=date" : "error=time");

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase!
    .from("mandirs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  const { error } = await supabase!.from("events").insert({
    mandir_id: mandir!.id,
    title,
    summary: summary || null,
    starts_at: startsAt!.toISOString(),
    all_day: allDay,
    status: "published",
    // Adding it is confirming it; the database records who did.
    confirmed_at: new Date().toISOString(),
  });
  if (error) back("error=failed");
  updateTag(`mandir:${mandir!.slug}`);
  back("added=1");
}

const CHANGES = {
  confirm: { confirmed_at: "now" },
  cancel: { status: "cancelled" },
  restore: { status: "published" },
  remove: { status: "removed" },
} as const;

export async function changeEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const eventId = String(formData.get("event") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const back = (query: string) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  if (!(intent in CHANGES)) back("error=failed");
  const change = CHANGES[intent as keyof typeof CHANGES];
  const update =
    "confirmed_at" in change
      ? { confirmed_at: new Date().toISOString() }
      : { status: change.status };

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase!
    .from("events")
    .update(update)
    .eq("id", eventId)
    .select("mandir:mandirs (slug)")
    .maybeSingle();
  if (error || !data) back("error=failed");
  if (data!.mandir) updateTag(`mandir:${data!.mandir.slug}`);
  back(`done=${intent}`);
}

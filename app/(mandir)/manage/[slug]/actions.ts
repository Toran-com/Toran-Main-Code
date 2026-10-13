"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { londonDate, londonToUtc } from "@/lib/format";
import { lookupPostcode } from "@/lib/geo";
import { parsePracticalDetails } from "@/lib/mandir-form";
import {
  occurrenceDates,
  type Repeat,
  toRule,
  weekOfMonth,
} from "@/lib/recurrence";
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
  const repeatChoice = String(formData.get("repeat") ?? "none");
  const untilInput = String(formData.get("until") ?? "");
  const back: (query: string) => never = (query) =>
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

  // Repeating: every date is worked out now, up to a year ahead.
  let rule: string | null = null;
  let dates = [date];
  if (repeatChoice !== "none") {
    const repeat = repeatFromChoice(repeatChoice, date);
    if (!repeat) back("error=repeat");
    const first = new Date(`${date}T00:00:00Z`).getTime();
    const until =
      untilInput || new Date(first + 182 * DAY_MS).toISOString().slice(0, 10);
    const lastAllowed = new Date(first + 366 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(until) ||
      until <= date ||
      until > lastAllowed
    ) {
      back("error=until");
    }
    rule = toRule(repeat, date, until);
    dates = occurrenceDates(rule, date);
  }

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      mandir_id: mandir.id,
      title,
      summary: summary || null,
      starts_at: startsAt.toISOString(),
      all_day: allDay,
      recurrence: rule,
      status: "published",
      // Adding it is confirming it; the database records who did.
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !event) back("error=failed");

  if (rule) {
    const rows = dates.flatMap((d) => {
      const at = londonToUtc(d, allDay ? "00:00" : time);
      return at ? [{ event_id: event.id, starts_at: at.toISOString() }] : [];
    });
    const { error: datesError } = await supabase
      .from("event_occurrences")
      .insert(rows);
    if (datesError) back("error=failed");
  }
  updateTag(`mandir:${mandir.slug}`);
  updateTag("events");
  back("added=1");
}

function repeatFromChoice(choice: string, date: string): Repeat | null {
  if (choice === "weekly") return { kind: "weekly", interval: 1 };
  if (choice === "fortnightly") return { kind: "weekly", interval: 2 };
  if (choice === "monthly") {
    const { week } = weekOfMonth(date);
    return { kind: "monthly", week: week >= 5 ? -1 : (week as 1 | 2 | 3 | 4) };
  }
  if (choice === "monthly-last") return { kind: "monthly", week: -1 };
  return null;
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
  updateTag("events");
  back(`done=${intent}`);
}

// A committee updates its mandir's practical details. Name, town, region
// and status stay with Toran admins (enforced by the database).
export async function updatePracticalDetails(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);
  const parsed = parsePracticalDetails(formData);
  if (!parsed.ok) back(`error=${parsed.error}`);
  const values = parsed.values;

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: before } = await supabase
    .from("mandirs")
    .select("postcode, latitude")
    .eq("slug", slug)
    .maybeSingle();
  if (!before) back("error=failed");

  let position = {};
  if (before.postcode !== values.postcode || before.latitude === null) {
    position = { latitude: null, longitude: null };
    if (values.postcode) {
      try {
        position = (await lookupPostcode(values.postcode)) ?? position;
      } catch {
        // Saved without a map position; Toran fills it in later.
      }
    }
  }

  const { data, error } = await supabase
    .from("mandirs")
    .update({ ...values, ...position })
    .eq("slug", slug)
    .select("slug");
  if (error || !data?.length) back("error=failed");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  back("done=details");
}

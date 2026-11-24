import { cacheLife, cacheTag } from "next/cache";
import type { Loaded } from "@/lib/directory";
import { londonDate } from "@/lib/london";
import { DAY, occurrences, type LiveEvent } from "@/lib/live-state";
import { createPublicServerClient } from "@/lib/supabase/server";

// Live now (decision 0026): what's happening at mandirs at this moment,
// and what's still to come today. The page is built ahead of time, so it
// comes with every event from yesterday to three days ahead, and the
// visitor's phone works out, minute by minute, which are on now.

export async function listLiveSoon(): Promise<Loaded<LiveEvent[]>> {
  "use cache";
  cacheTag("events", "mandirs");
  let db;
  try {
    db = createPublicServerClient();
  } catch {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  if (!db) {
    cacheLife("hours");
    return { state: "not connected" };
  }
  const today = Date.parse(`${londonDate()}T00:00:00Z`);
  const from = new Date(today - DAY).toISOString();
  const to = new Date(today + 3 * DAY).toISOString();
  const { data, error } = await db
    .from("events")
    .select(
      "id, title, title_gu, kind, origin, all_day, starts_at, ends_at, recurrence, mandir:mandirs!inner (slug, name, town, live_url), event_occurrences (starts_at, ends_at, cancelled)",
    )
    .eq("status", "published")
    .or(`starts_at.gte."${from}",recurrence.not.is.null`)
    .lte("starts_at", to)
    .gte("event_occurrences.starts_at", from)
    .lte("event_occurrences.starts_at", to)
    .order("starts_at")
    .limit(2000);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  return { state: "ok", data: occurrences(data, from, to) };
}

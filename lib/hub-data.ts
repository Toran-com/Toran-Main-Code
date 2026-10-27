import { cacheLife, cacheTag } from "next/cache";
import type { Loaded } from "@/lib/directory";
import type { Json } from "@/lib/database.types";
import { createPublicServerClient } from "@/lib/supabase/server";

// The public details My Toran shows for the mandirs and events a visitor
// keeps on their phone. Read as a visitor, cached and shared like the rest
// of the directory; only the ids are asked for, nothing about the visitor.

export type HubMandirRow = {
  slug: string;
  name: string;
  town: string;
  opening_hours: Json | null;
};

export type HubEventRow = {
  id: string;
  title: string;
  title_gu: string | null;
  all_day: boolean;
  status: string;
  mandir: { slug: string; name: string; town: string };
};

function client() {
  try {
    return createPublicServerClient();
  } catch {
    return "misconfigured" as const;
  }
}

export async function mandirsForHub(
  slugs: string[],
): Promise<Loaded<HubMandirRow[]>> {
  "use cache";
  cacheTag("mandirs");
  const db = client();
  if (db === "misconfigured") {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  if (!db) {
    cacheLife("hours");
    return { state: "not connected" };
  }
  if (!slugs.length) return { state: "ok", data: [] };
  const { data, error } = await db
    .from("mandirs")
    .select("slug, name, town, opening_hours")
    .in("slug", slugs);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  return { state: "ok", data };
}

// Events by id, past ones too (unlike the plan page), so My Toran can name
// the events someone went to.
export async function eventsForHub(
  ids: string[],
): Promise<Loaded<HubEventRow[]>> {
  "use cache";
  cacheTag("events", "mandirs");
  const db = client();
  if (db === "misconfigured") {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  if (!db) {
    cacheLife("hours");
    return { state: "not connected" };
  }
  if (!ids.length) return { state: "ok", data: [] };
  const { data, error } = await db
    .from("events")
    .select(
      "id, title, title_gu, all_day, status, mandir:mandirs!inner (slug, name, town)",
    )
    .in("id", ids)
    .in("status", ["published", "cancelled"]);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  return { state: "ok", data };
}

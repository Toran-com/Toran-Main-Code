// Seva across mandirs, for the Seva page (/seva): every event whose
// committee has turned online sign-up on and still needs people, soonest
// first. Built from the rotas' numbers only; no volunteer is named anywhere
// (decision 0013). Pure helpers first, so the rules are tested on their
// own; the loader below reads public data as a visitor, cached and shared.

import { cacheLife, cacheTag } from "next/cache";
import type { Loaded } from "@/lib/directory";
import { londonDate } from "@/lib/format";
import { placesTaken } from "@/lib/seva";
import { createPublicServerClient } from "@/lib/supabase/server";

export type SevaShiftNeed = {
  id: string;
  role: string;
  needsDbs: boolean;
  startsAt: string;
  endsAt: string;
  needed: number;
  free: number;
};

export type SevaNeed = {
  event: { id: string; title: string; title_gu: string | null };
  mandir: {
    slug: string;
    name: string;
    town: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
  };
  // When the first shift that still needs people starts: what the list is
  // sorted and grouped by.
  next_starts_at: string;
  // Shifts still needing people, soonest first.
  shifts: SevaShiftNeed[];
  // Places free across those shifts, and how many can be taken online
  // (shifts needing a DBS check go through the committee).
  free: number;
  freeOnline: number;
};

export type SevaRow = {
  id: string;
  title: string;
  title_gu: string | null;
  mandir: SevaNeed["mandir"];
  seva_roles: {
    name: string;
    needs_dbs: boolean;
    seva_shifts: {
      id: string;
      starts_at: string;
      ends_at: string;
      needed: number;
      filled_offline: number;
      taken_online: number;
    }[];
  }[];
};

// The events that still need people, from shifts that haven't ended.
export function sevaNeeds(rows: readonly SevaRow[], now: Date): SevaNeed[] {
  const at = now.toISOString();
  return rows
    .flatMap((row) => {
      const shifts = row.seva_roles
        .flatMap((role) =>
          role.seva_shifts.map((s) => ({
            id: s.id,
            role: role.name,
            needsDbs: role.needs_dbs,
            startsAt: s.starts_at,
            endsAt: s.ends_at,
            needed: s.needed,
            free: s.needed - placesTaken(s),
          })),
        )
        .filter((s) => s.endsAt > at && s.free > 0)
        .sort(
          (a, b) =>
            a.startsAt.localeCompare(b.startsAt) ||
            a.role.localeCompare(b.role),
        );
      if (!shifts.length) return [];
      const free = shifts.reduce((sum, s) => sum + s.free, 0);
      const freeOnline = shifts
        .filter((s) => !s.needsDbs)
        .reduce((sum, s) => sum + s.free, 0);
      return [
        {
          event: { id: row.id, title: row.title, title_gu: row.title_gu },
          mandir: row.mandir,
          next_starts_at: shifts[0].startsAt,
          shifts,
          free,
          freeOnline,
        },
      ];
    })
    .sort((a, b) => a.next_starts_at.localeCompare(b.next_starts_at));
}

// The numbers at the top of the Seva page: places still needed, at how
// many mandirs, and slots taken on Toran for shifts still to come.
// Totals only; nothing about who.
export function sevaTotals(
  rows: readonly SevaRow[],
  now: Date,
): { places: number; mandirs: number; taken: number } {
  const needs = sevaNeeds(rows, now);
  const at = now.toISOString();
  return {
    places: needs.reduce((sum, n) => sum + n.free, 0),
    mandirs: new Set(needs.map((n) => n.mandir.slug)).size,
    taken: rows
      .flatMap((r) => r.seva_roles.flatMap((role) => role.seva_shifts))
      .filter((s) => s.ends_at > at)
      .reduce((sum, s) => sum + s.taken_online, 0),
  };
}

// Seva is asked for up to this far ahead.
const WEEKS_AHEAD = 12;

// The rotas, cached; sevaNeeds() is applied per visit, so shifts that have
// ended drop off at once. Taking or giving back a slot, and any change a
// committee makes to a rota, refreshes the "seva" tag.
export async function listSevaRotas(): Promise<Loaded<SevaRow[]>> {
  "use cache";
  cacheTag("events", "mandirs", "seva");
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
  const from = `${londonDate()}T00:00:00Z`;
  const to = new Date(
    Date.parse(from) + WEEKS_AHEAD * 7 * 86_400_000,
  ).toISOString();
  const { data, error } = await db
    .from("events")
    .select(
      "id, title, title_gu, mandir:mandirs!inner (slug, name, town, region, latitude, longitude), seva_roles!inner (name, needs_dbs, seva_shifts!inner (id, starts_at, ends_at, needed, filled_offline, taken_online))",
    )
    .eq("seva_open", true)
    .eq("status", "published")
    .gte("seva_roles.seva_shifts.ends_at", from)
    .lte("seva_roles.seva_shifts.starts_at", to)
    .limit(500);
  if (error) {
    cacheLife("minutes");
    return { state: "unavailable" };
  }
  cacheLife("hours");
  return { state: "ok", data };
}

// How much seva is being asked for, for the home page: saved with the
// page, so it's worked out from the start of today.
export async function sevaSummary(): Promise<{
  events: number;
  places: number;
} | null> {
  "use cache";
  cacheTag("events", "mandirs", "seva");
  cacheLife("hours");
  const rotas = await listSevaRotas();
  if (rotas.state !== "ok") return null;
  const needs = sevaNeeds(rotas.data, new Date(`${londonDate()}T00:00:00Z`));
  return {
    events: needs.length,
    places: needs.reduce((sum, n) => sum + n.free, 0),
  };
}

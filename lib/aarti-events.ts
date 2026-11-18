import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { checkEvent } from "@/lib/event-form";
import { saveEvent } from "@/lib/event-store";
import { londonDate, londonTime } from "@/lib/london";
import {
  type Aarti,
  dayKey,
  readAartis,
  type Weekday,
} from "@/lib/opening-hours";
import { parseRule, type Repeat } from "@/lib/recurrence";

// A mandir's aarti times, as events: each aarti a committee gives in its
// details (lib/opening-hours.ts) becomes an event on its days (every day,
// unless it says otherwise) for a year, so it shows in What's on and near
// me like any other. They're marked origin "aarti", kept in step whenever
// the times are saved, and renewed each night before their year runs out
// (lib/nightly.ts).

// Renewed once fewer than this many days are left.
export const RENEW_WITHIN_DAYS = 30;

export type AartiEvent = {
  id: string;
  title: string;
  // Its time in London, "07:00", and the last day it's listed.
  time: string;
  until: string;
  // The days it's on; every day when not given.
  days?: Weekday[];
};

// What to keep, take off and add so the events match the aarti times.
// Pure, so it's tested on its own.
export function planAartiEvents(
  aartis: readonly Aarti[],
  existing: readonly AartiEvent[],
  today: string,
): { keep: string[]; remove: string[]; add: Aarti[] } {
  const renewBy = addDays(today, RENEW_WITHIN_DAYS);
  const unused = [...existing];
  const keep: string[] = [];
  const add: Aarti[] = [];
  for (const aarti of aartis) {
    const i = unused.findIndex(
      (e) =>
        e.title === aarti.name &&
        e.time === aarti.time &&
        dayKey(e.days) === dayKey(aarti.days) &&
        e.until >= renewBy,
    );
    if (i === -1) {
      add.push(aarti);
    } else {
      keep.push(unused[i].id);
      unused.splice(i, 1);
    }
  }
  return { keep, remove: unused.map((e) => e.id), add };
}

// Makes the mandir's aarti events match its aarti times. Row-level
// security decides who may: the mandir's committee, or Toran.
export async function syncAartiEvents(
  db: SupabaseClient<Database>,
  mandirId: string,
  aartis: readonly Aarti[],
  now: Date = new Date(),
): Promise<{ added: number; removed: number }> {
  const today = londonDate(now);
  const { data } = await db
    .from("events")
    .select("id, title, starts_at, recurrence")
    .eq("mandir_id", mandirId)
    .eq("origin", "aarti")
    .neq("status", "removed");
  const existing: AartiEvent[] = (data ?? []).map((e) => {
    const rule = e.recurrence ? parseRule(e.recurrence) : null;
    return {
      id: e.id,
      title: e.title,
      time: londonTime(new Date(e.starts_at)),
      until: rule?.until ?? "",
      days: rule ? ruleDays(rule.repeat, rule.weekday) : undefined,
    };
  });
  const plan = planAartiEvents(aartis, existing, today);

  if (plan.remove.length) {
    await db.from("events").update({ status: "removed" }).in("id", plan.remove);
  }
  let added = 0;
  for (const aarti of plan.add) {
    const { date, repeat } = firstAndRepeat(aarti.days, today);
    const checked = checkEvent(
      {
        title: aarti.name,
        date,
        time: aarti.time,
        summary: "",
        repeat,
        until: "",
        kind: "aarti",
      },
      now,
    );
    if (!checked.ok) continue;
    const saved = await saveEvent(db, mandirId, checked.event, {
      confirmed: true,
      origin: "aarti",
    });
    if (saved.ok) added++;
  }
  return { added, removed: plan.remove.length };
}

// The first day it's on, from today, and how it repeats ("daily", or
// "days:1,2" in the event form's terms, where 0 is Sunday).
export function firstAndRepeat(
  days: readonly Weekday[] | undefined,
  today: string,
): { date: string; repeat: string } {
  if (!days?.length || days.length === 7) {
    return { date: today, repeat: "daily" };
  }
  // Sunday is 7 here and 0 in the event's rule.
  const js = days.map((d) => d % 7);
  let date = today;
  while (!js.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) {
    date = addDays(date, 1);
  }
  return { date, repeat: `days:${js.join(",")}` };
}

// The days an existing aarti event is on, from its rule.
function ruleDays(repeat: Repeat, weekday: number): Weekday[] | undefined {
  if (repeat.kind === "days") {
    return repeat.days.map((d) => (d === 0 ? 7 : d) as Weekday);
  }
  if (repeat.kind === "weekly" && weekday >= 0) {
    return [(weekday === 0 ? 7 : weekday) as Weekday];
  }
  return undefined;
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// Each night (lib/nightly.ts): every mandir's aarti events are checked
// against its aarti times and renewed for another year before they run
// out. How many were added.
export async function renewAartiEvents(
  db: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<number> {
  const { data: mandirs } = await db
    .from("mandirs")
    .select("id, aarti_times")
    .not("aarti_times", "is", null)
    .neq("status", "hidden");
  let added = 0;
  for (const mandir of mandirs ?? []) {
    const aartis = readAartis(mandir.aarti_times);
    if (!aartis.length) continue;
    added += (await syncAartiEvents(db, mandir.id, aartis, now)).added;
  }
  return added;
}

// My Toran (/my): what a visitor keeps on their phone, put together.
// Plain functions, so they can be tested; components/hub.tsx draws them.

import { parseVisits, type Visit } from "@/lib/event-history";
import { cleanSlugs } from "@/lib/follow";
import { londonDate } from "@/lib/london";
import { cleanEventIds, type Planned } from "@/lib/plan";
import {
  type DoneShift,
  parseDone,
  shiftHours,
  shiftMandir,
} from "@/lib/seva-history";

// A seva slot as the phone keeps it (components/seva-slots.tsx).
export type TakenSlot = DoneShift & { shift: string; event: string };

// What's coming up, soonest first: events in the plan and seva shifts
// that haven't ended.
export type Upcoming =
  | { kind: "event"; at: string; id: string }
  | { kind: "seva"; at: string; slot: TakenSlot };

export function comingUp(
  plan: Planned[],
  slots: TakenSlot[],
  now: Date,
): Upcoming[] {
  const stamp = now.getTime();
  return [
    ...plan.map((p) => ({ kind: "event" as const, at: p.at, id: p.id })),
    ...slots
      .filter((s) => Date.parse(s.ends_at) > stamp)
      .map((s) => ({ kind: "seva" as const, at: s.starts_at, slot: s })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

// Items in runs of the same UK day, for headings like "Sat 31 Oct".
export function byDay<T extends { at: string }>(
  items: T[],
): { day: string; items: T[] }[] {
  const days: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = londonDate(new Date(item.at));
    const last = days.at(-1);
    if (last?.day === day) last.items.push(item);
    else days.push({ day, items: [item] });
  }
  return days;
}

// The totals at the top of My Toran, for one year (UK dates).
export function yearTotals({
  year,
  went,
  done,
  mandirOf,
}: {
  year: string;
  went: Visit[];
  done: DoneShift[];
  // The mandir an event was at, once its details have loaded.
  mandirOf: (eventId: string) => string | undefined;
}): { events: number; shifts: number; hours: number; mandirs: number } {
  const inYear = (at: string) => londonDate(new Date(at)).startsWith(year);
  const events = went.filter((v) => inYear(v.at));
  const shifts = done.filter((s) => inYear(s.starts_at));
  const mandirs = new Set(
    [
      ...events.map((v) => mandirOf(v.id)),
      ...shifts.map((s) => shiftMandir(s)),
    ].filter(Boolean),
  );
  return {
    events: events.length,
    shifts: shifts.length,
    hours: shifts.reduce((sum, s) => sum + shiftHours(s), 0),
    mandirs: mandirs.size,
  };
}

// Everything on this phone, to copy to a new one. It travels in the part
// of the address after "#", which browsers never send to a website, so
// it goes from one phone to the other without reaching Toran.
export type MoveData = {
  following: string[];
  plan: Planned[];
  visits: Visit[];
  done: DoneShift[];
  slots: TakenSlot[];
};

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeMove(data: MoveData): string {
  return toBase64Url(
    JSON.stringify({
      f: data.following,
      p: data.plan,
      v: data.visits,
      d: data.done,
      s: data.slots,
    }),
  );
}

function cleanSlots(value: unknown): TakenSlot[] {
  if (!Array.isArray(value)) return [];
  const done = parseDone(JSON.stringify(value));
  const extra = new Map(
    value
      .filter(
        (v): v is Record<string, unknown> =>
          !!v &&
          typeof v === "object" &&
          typeof (v as TakenSlot).slot === "string" &&
          typeof (v as TakenSlot).shift === "string" &&
          typeof (v as TakenSlot).event === "string",
      )
      .map((v) => [v.slot as string, v]),
  );
  return done.flatMap((d) => {
    const v = extra.get(d.slot);
    return v
      ? [
          {
            ...d,
            shift: (v.shift as string).slice(0, 100),
            event: (v.event as string).slice(0, 100),
          },
        ]
      : [];
  });
}

// Whatever came in a "move" link, cleaned up as if it had been saved on
// this phone. Nothing usable means null.
export function decodeMove(text: string): MoveData | null {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(text));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const plan = Array.isArray(r.p)
    ? r.p.filter(
        (p): p is Planned =>
          !!p &&
          typeof p === "object" &&
          cleanEventIds((p as Planned).id).length === 1 &&
          typeof (p as Planned).at === "string" &&
          !Number.isNaN(Date.parse((p as Planned).at)),
      )
    : [];
  const data: MoveData = {
    following: cleanSlugs(r.f),
    plan: plan.map(({ id, at }) => ({ id, at })),
    visits: parseVisits(JSON.stringify(Array.isArray(r.v) ? r.v : [])),
    done: parseDone(JSON.stringify(Array.isArray(r.d) ? r.d : [])),
    slots: cleanSlots(r.s),
  };
  const empty =
    !data.following.length &&
    !data.plan.length &&
    !data.visits.length &&
    !data.done.length &&
    !data.slots.length;
  return empty ? null : data;
}

export function hubPath(locale: string): string {
  return locale === "gu" ? "/gu/my" : "/my";
}

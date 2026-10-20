// Quicker ways for a committee to fill its page: the festivals coming up,
// ready to tick, and last year's events moved to this year's dates. Pure,
// so the date rules are tested on their own; the committee page reads the
// rows and the "Add the ticked events" action saves them.

import { mentionsFestival } from "@/lib/festival-words";
import { londonDate, londonTime } from "@/lib/format";
import type { EventInput } from "@/lib/event-form";

const DAY_MS = 86_400_000;

// How far ahead festivals are offered, and how far ahead last year's
// events are moved to.
export const FESTIVAL_DAYS_AHEAD = 90;
export const LAST_YEAR_DAYS_AHEAD = 120;
// Most events added in one go.
export const MOST_PICKS = 20;

// A festival's date in one calendar tradition (festival_dates).
export type FestivalDateRow = {
  id: string;
  festival_id: string;
  calendar: string | null;
  starts_on: string;
  festival: { slug: string; name: string } | null;
};

// An event the committee can add by ticking it.
export type QuickPick = {
  title: string;
  date: string;
  time: string;
  kind: string;
  summary: string;
  title_gu: string;
  summary_gu: string;
  festivalDateId: string | null;
  // Where it came from, e.g. "Last year: Tue 21 Oct 2025".
  note: string | null;
};

// An event already on the page, so nothing is offered twice.
export type ExistingEvent = {
  title: string;
  starts_at: string;
  festival_date_id: string | null;
};

// An event from last year, with the festival date it was linked to.
export type PastEvent = {
  title: string;
  summary: string | null;
  title_gu: string | null;
  summary_gu: string | null;
  kind: string;
  starts_at: string;
  all_day: boolean;
  festival_date: { festival_id: string; starts_on: string } | null;
};

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      DAY_MS,
  );
}

// One date per festival per year, in the mandir's own tradition where
// there is one: its own calendar first, then the date every tradition
// shares, then whichever there is.
export function datesForMandir(
  rows: FestivalDateRow[],
  calendar: string | null,
): FestivalDateRow[] {
  const rank = (row: FestivalDateRow) =>
    calendar && row.calendar === calendar ? 0 : row.calendar === null ? 1 : 2;
  const best = new Map<string, FestivalDateRow>();
  for (const row of rows) {
    const key = `${row.festival_id}:${row.starts_on.slice(0, 4)}`;
    const current = best.get(key);
    if (!current || rank(row) < rank(current)) best.set(key, row);
  }
  return [...best.values()].sort((a, b) =>
    a.starts_on.localeCompare(b.starts_on),
  );
}

// Whether the page already has this festival: an event linked to it, or
// one named after it within a few days.
function alreadyAdded(row: FestivalDateRow, existing: ExistingEvent[]) {
  return existing.some((event) => {
    if (event.festival_date_id === row.id) return true;
    const day = londonDate(new Date(event.starts_at));
    return (
      !!row.festival &&
      Math.abs(daysBetween(row.starts_on, day)) <= 3 &&
      mentionsFestival(row.festival.slug, event.title)
    );
  });
}

// The festivals in the next few months that the page doesn't have yet,
// each ready to add as an all-day festival event.
export function festivalPicks(
  rows: FestivalDateRow[],
  calendar: string | null,
  existing: ExistingEvent[],
  today: string = londonDate(),
): QuickPick[] {
  const latest = addDays(today, FESTIVAL_DAYS_AHEAD);
  return datesForMandir(rows, calendar)
    .filter(
      (row) =>
        row.festival &&
        row.starts_on >= today &&
        row.starts_on <= latest &&
        !alreadyAdded(row, existing),
    )
    .map((row) => ({
      title: row.festival!.name,
      date: row.starts_on,
      time: "",
      kind: "festival",
      summary: "",
      title_gu: "",
      summary_gu: "",
      festivalDateId: row.id,
      note: null,
    }));
}

// Where last year's event falls this year. Linked to a festival: the same
// number of days from this year's festival date (so "the evening before
// Diwali" stays the evening before). Named after a festival: that
// festival's date this year, if it's close. Otherwise 52 weeks on, the
// same day of the week.
function thisYear(
  event: PastEvent,
  dates: FestivalDateRow[],
): { date: string; festivalDateId: string | null } {
  const was = londonDate(new Date(event.starts_at));
  const plain = addDays(was, 364);
  if (event.festival_date) {
    const { festival_id, starts_on } = event.festival_date;
    const next = dates.find(
      (row) =>
        row.festival_id === festival_id &&
        daysBetween(starts_on, row.starts_on) >= 300 &&
        daysBetween(starts_on, row.starts_on) <= 430,
    );
    if (next) {
      return {
        date: addDays(next.starts_on, daysBetween(starts_on, was)),
        festivalDateId: next.id,
      };
    }
    return { date: plain, festivalDateId: null };
  }
  const named = dates.find(
    (row) =>
      row.festival &&
      Math.abs(daysBetween(plain, row.starts_on)) <= 30 &&
      mentionsFestival(row.festival.slug, event.title),
  );
  return named
    ? { date: named.starts_on, festivalDateId: named.id }
    : { date: plain, festivalDateId: null };
}

// Last year's events, moved to this year's dates: those falling in the
// next few months that the page doesn't already have (same name, same day).
export function lastYearPicks(
  past: PastEvent[],
  rows: FestivalDateRow[],
  calendar: string | null,
  existing: ExistingEvent[],
  today: string = londonDate(),
): QuickPick[] {
  const dates = datesForMandir(rows, calendar);
  const latest = addDays(today, LAST_YEAR_DAYS_AHEAD);
  const taken = new Set(
    existing.map(
      (e) =>
        `${e.title.trim().toLowerCase()}|${londonDate(new Date(e.starts_at))}`,
    ),
  );
  const picks: QuickPick[] = [];
  for (const event of past) {
    const { date, festivalDateId } = thisYear(event, dates);
    const key = `${event.title.trim().toLowerCase()}|${date}`;
    if (date < today || date > latest || taken.has(key)) continue;
    taken.add(key);
    picks.push({
      title: event.title,
      date,
      time: event.all_day ? "" : londonTime(new Date(event.starts_at)),
      kind: event.kind,
      summary: event.summary ?? "",
      title_gu: event.title_gu ?? "",
      summary_gu: event.summary_gu ?? "",
      festivalDateId,
      note: `Last year: ${lastYearLabel(event.starts_at)}`,
    });
  }
  return picks.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
}

// The window of last year's events worth looking at (as ISO timestamps).
export function lastYearWindow(today: string = londonDate()) {
  return {
    from: `${addDays(today, -400)}T00:00:00Z`,
    to: `${addDays(today, -364 + LAST_YEAR_DAYS_AHEAD + 1)}T00:00:00Z`,
  };
}

function lastYearLabel(startsAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(startsAt))
    .replace(",", "");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The ticked rows of a "pick" form, as event details to check and save.
export function picksFromForm(source: {
  get(name: string): unknown;
  getAll(name: string): unknown[];
}): { input: EventInput; festivalDateId: string | null }[] {
  const text = (name: string) => String(source.get(name) ?? "").trim();
  const ticked = [
    ...new Set(source.getAll("pick").map((value) => String(value))),
  ]
    .filter((value) => /^\d{1,2}$/.test(value))
    .slice(0, MOST_PICKS);
  return ticked.map((i) => {
    const festival = text(`festival-${i}`);
    return {
      input: {
        title: text(`title-${i}`),
        date: text(`date-${i}`),
        time: text(`time-${i}`),
        summary: text(`summary-${i}`),
        repeat: "none",
        until: "",
        title_gu: text(`title_gu-${i}`),
        summary_gu: text(`summary_gu-${i}`),
        kind: text(`kind-${i}`) || "other",
      },
      festivalDateId: UUID.test(festival) ? festival : null,
    };
  });
}

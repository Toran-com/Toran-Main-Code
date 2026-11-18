import { londonDate, londonTime } from "@/lib/london";

// When a mandir is open for darshan, and its aarti times. Each day can
// have up to two sessions (most mandirs close in the afternoon); a day
// with none is closed. Times are UK time, "HH:MM". No translations here,
// so the "Open now" badge in the browser can use it cheaply.

// 1 is Monday … 7 is Sunday.
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export type Session = { day: Weekday; opens: string; closes: string };
// An aarti, at the same time on the days it's on: every day unless `days`
// says otherwise (an evening aarti Monday to Saturday, another on Sunday).
export type Aarti = { name: string; time: string; days?: Weekday[] };

// The days an aarti can be on, as the form offers them; "custom" is ticking
// the days one by one.
export const AARTI_DAYS: readonly {
  value: string;
  label: string;
  days: Weekday[];
}[] = [
  { value: "all", label: "Every day", days: [1, 2, 3, 4, 5, 6, 7] },
  { value: "1-5", label: "Monday to Friday", days: [1, 2, 3, 4, 5] },
  { value: "1-6", label: "Monday to Saturday", days: [1, 2, 3, 4, 5, 6] },
  { value: "6-7", label: "Saturday and Sunday", days: [6, 7] },
  { value: "6", label: "Saturdays", days: [6] },
  { value: "7", label: "Sundays", days: [7] },
];

// The form's choice for an aarti's days.
export function aartiDaysChoice(aarti: Pick<Aarti, "days">): string {
  const key = dayKey(aarti.days);
  return AARTI_DAYS.find((c) => dayKey(c.days) === key)?.value ?? "custom";
}

// The days, in order, as one string ("123456"), for comparing.
export function dayKey(days: readonly Weekday[] | undefined): string {
  return days?.length ? [...days].sort().join("") : "1234567";
}

// Days in a row run together: [1, 2, 3, 4, 5, 6] is one run, Monday to
// Saturday; [6, 7] and [1, 3, 5] are runs of their own days.
export function dayRuns(days: readonly Weekday[]): [Weekday, Weekday][] {
  const sorted = [...new Set(days)].sort();
  const runs: [Weekday, Weekday][] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    if (j - i >= 2) runs.push([sorted[i], sorted[j]]);
    else for (let k = i; k <= j; k++) runs.push([sorted[k], sorted[k]]);
    i = j + 1;
  }
  return runs;
}

export const SESSIONS_PER_DAY = 2;
export const MAX_AARTIS = 6;
export const AARTI_NAME_MAX = 40;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isClock = (value: string) => CLOCK.test(value);

const minutes = (clock: string) =>
  Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

// The form's fields: open-<day>-<session> and close-<day>-<session>, then
// aarti-name-<n>, aarti-time-<n> and aarti-days-<n> (one of AARTI_DAYS, or
// "custom" with each day ticked as aarti-day-<n>).
export const openField = (day: Weekday, session: number) =>
  `open-${day}-${session}`;
export const closeField = (day: Weekday, session: number) =>
  `close-${day}-${session}`;

export type HoursResult =
  | { ok: true; sessions: Session[]; aartis: Aarti[] }
  | { ok: false; error: "hours" | "aarti"; day?: Weekday };

export function parseHours(form: FormData): HoursResult {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const sessions: Session[] = [];
  for (const day of WEEKDAYS) {
    const today: Session[] = [];
    for (let s = 0; s < SESSIONS_PER_DAY; s++) {
      const opens = text(openField(day, s));
      const closes = text(closeField(day, s));
      if (!opens && !closes) continue;
      // Both times, opening before closing, the same day.
      if (!isClock(opens) || !isClock(closes)) {
        return { ok: false, error: "hours", day };
      }
      if (minutes(closes) <= minutes(opens)) {
        return { ok: false, error: "hours", day };
      }
      today.push({ day, opens, closes });
    }
    today.sort((a, b) => minutes(a.opens) - minutes(b.opens));
    // A second session can't start before the first has closed.
    if (
      today.length === 2 &&
      minutes(today[1].opens) < minutes(today[0].closes)
    ) {
      return { ok: false, error: "hours", day };
    }
    sessions.push(...today);
  }

  const aartis: Aarti[] = [];
  for (let n = 0; n < MAX_AARTIS; n++) {
    const name = text(`aarti-name-${n}`);
    const time = text(`aarti-time-${n}`);
    if (!name && !time) continue;
    if (!isClock(time) || name.length > AARTI_NAME_MAX) {
      return { ok: false, error: "aarti" };
    }
    const choice = text(`aarti-days-${n}`) || "all";
    const days =
      choice === "custom"
        ? [
            ...new Set(
              form
                .getAll(`aarti-day-${n}`)
                .map(Number)
                .filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday)),
            ),
          ].sort()
        : AARTI_DAYS.find((c) => c.value === choice)?.days;
    // On at least one day.
    if (!days?.length) return { ok: false, error: "aarti" };
    aartis.push(
      days.length === 7
        ? { name: name || "Aarti", time }
        : { name: name || "Aarti", time, days },
    );
  }
  // By time, then by the first day it's on.
  aartis.sort(
    (a, b) =>
      minutes(a.time) - minutes(b.time) ||
      dayKey(a.days).localeCompare(dayKey(b.days)),
  );
  return { ok: true, sessions, aartis };
}

// The day of the week and the time in London.
export function londonNow(now: Date): { day: Weekday; clock: string } {
  const [y, m, d] = londonDate(now).split("-").map(Number);
  // Sunday is 0 in JavaScript and 7 here.
  const day = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7) as Weekday;
  return { day, clock: londonTime(now) };
}

export type OpenState =
  | { open: true; closes: string }
  | { open: false; opens: string; day: Weekday; inDays: number };

// Open now (and until when), or when it next opens. Null when the mandir
// hasn't given its times.
export function openState(
  sessions: readonly Session[],
  now: Date,
): OpenState | null {
  if (!sessions.length) return null;
  const { day, clock } = londonNow(now);
  const at = minutes(clock);
  for (let inDays = 0; inDays < 8; inDays++) {
    const weekday = (((day - 1 + inDays) % 7) + 1) as Weekday;
    const sorted = sessions
      .filter((s) => s.day === weekday)
      .sort((a, b) => minutes(a.opens) - minutes(b.opens));
    for (const s of sorted) {
      if (inDays === 0 && minutes(s.opens) <= at && at < minutes(s.closes)) {
        return { open: true, closes: s.closes };
      }
      if (inDays > 0 || minutes(s.opens) > at) {
        return { open: false, opens: s.opens, day: weekday, inDays };
      }
    }
  }
  return null;
}

// The week as rows, with days that have the same times run together:
// Mon–Fri 7:30–12:00 and 16:00–20:00, Sat–Sun 7:00–21:00.
export type WeekRow = {
  from: Weekday;
  to: Weekday;
  sessions: { opens: string; closes: string }[];
};

export function weekRows(sessions: readonly Session[]): WeekRow[] {
  if (!sessions.length) return [];
  const rows: WeekRow[] = [];
  for (const day of WEEKDAYS) {
    const today = sessions
      .filter((s) => s.day === day)
      .sort((a, b) => minutes(a.opens) - minutes(b.opens))
      .map(({ opens, closes }) => ({ opens, closes }));
    const last = rows[rows.length - 1];
    if (last && JSON.stringify(last.sessions) === JSON.stringify(today)) {
      last.to = day;
    } else {
      rows.push({ from: day, to: day, sessions: today });
    }
  }
  return rows;
}

// What the database keeps: lists, or null when nothing was given.
export function readSessions(value: unknown): Session[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (s): s is Session =>
      !!s &&
      typeof s === "object" &&
      WEEKDAYS.includes((s as Session).day) &&
      isClock(String((s as Session).opens)) &&
      isClock(String((s as Session).closes)),
  );
}

export function readAartis(value: unknown): Aarti[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (a): a is Aarti =>
        !!a &&
        typeof a === "object" &&
        typeof (a as Aarti).name === "string" &&
        isClock(String((a as Aarti).time)),
    )
    .map(({ name, time, days }) => {
      const on = Array.isArray(days)
        ? [...new Set(days)].filter((d) => WEEKDAYS.includes(d)).sort()
        : [];
      return on.length && on.length < 7
        ? { name, time, days: on }
        : { name, time };
    });
}

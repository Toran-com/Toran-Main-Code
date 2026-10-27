// Checks the details of a new event, wherever they were typed: a
// committee's "Add an event" form, or Toran's poster queue. Pure, so the
// rules are tested once and the same everywhere.

import { type EventKind, isEventKind } from "@/lib/event-kinds";
import { londonDate, londonTime, londonToUtc } from "@/lib/format";
import {
  MAX_DAILY_DAYS,
  occurrenceDates,
  parseRule,
  type Repeat,
  toRule,
  weekOfMonth,
} from "@/lib/recurrence";

const DAY_MS = 86_400_000;

// What the forms send, as text. Also what a poster in the queue stores
// (posters don't carry the Gujarati, so it's optional).
export type EventInput = {
  title: string;
  date: string;
  time: string;
  summary: string;
  repeat: string;
  until: string;
  title_gu?: string;
  summary_gu?: string;
  // What kind of event (lib/event-kinds.ts); posters leave it out.
  kind?: string;
};

export type EventError =
  | "title"
  | "summary"
  | "titleGu"
  | "summaryGu"
  | "kind"
  | "date"
  | "time"
  | "repeat"
  | "until"
  | "untilDaily";

export type CheckedEvent = {
  title: string;
  summary: string | null;
  // The same in Gujarati, if given.
  titleGu: string | null;
  summaryGu: string | null;
  kind: EventKind;
  allDay: boolean;
  startsAt: Date;
  rule: string | null;
  // Every date's start, for a repeating event (empty otherwise).
  occurrences: Date[];
};

export const EVENT_FIELDS = [
  "title",
  "date",
  "time",
  "summary",
  "repeat",
  "until",
] as const;

export function eventInputFrom(source: {
  get(name: string): unknown;
}): EventInput {
  const text = (name: string) => String(source.get(name) ?? "").trim();
  return {
    title: text("title"),
    date: text("date"),
    time: text("time"),
    summary: text("summary"),
    repeat: text("repeat") || "none",
    until: text("until"),
    title_gu: text("title_gu"),
    summary_gu: text("summary_gu"),
    kind: text("kind") || "other",
  };
}

// An existing event as the form's starting values. A repeating event
// starts from its next date, so the form never offers a date in the past.
export function eventInputFromEvent(event: {
  title: string;
  summary: string | null;
  title_gu: string | null;
  summary_gu: string | null;
  all_day: boolean;
  recurrence: string | null;
  next_starts_at: string;
  kind?: string;
}): EventInput {
  const at = new Date(event.next_starts_at);
  const parsed = event.recurrence ? parseRule(event.recurrence) : null;
  return {
    title: event.title,
    date: londonDate(at),
    time: event.all_day ? "" : londonTime(at),
    summary: event.summary ?? "",
    repeat: parsed ? repeatChoiceFor(parsed.repeat) : "none",
    until: parsed?.until ?? "",
    title_gu: event.title_gu ?? "",
    summary_gu: event.summary_gu ?? "",
    kind: event.kind ?? "other",
  };
}

function repeatChoiceFor(repeat: Repeat): string {
  if (repeat.kind === "daily") return "daily";
  if (repeat.kind === "weekly") {
    return repeat.interval === 1 ? "weekly" : "fortnightly";
  }
  return repeat.week === -1 ? "monthly-last" : "monthly";
}

export function checkEvent(
  input: EventInput,
  now: Date = new Date(),
): { ok: true; event: CheckedEvent } | { ok: false; error: EventError } {
  const fail = (error: EventError) => ({ ok: false as const, error });
  const { title, date, time, summary } = input;
  if (title.length < 2 || title.length > 120) return fail("title");
  if (summary.length > 280) return fail("summary");
  const titleGu = input.title_gu?.trim() ?? "";
  const summaryGu = input.summary_gu?.trim() ?? "";
  if (titleGu && (titleGu.length < 2 || titleGu.length > 120)) {
    return fail("titleGu");
  }
  if (summaryGu.length > 280) return fail("summaryGu");
  const kind = input.kind || "other";
  if (!isEventKind(kind)) return fail("kind");
  const today = londonDate(now);
  const latest = londonDate(new Date(now.getTime() + 2 * 366 * DAY_MS));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > latest) {
    return fail("date");
  }
  const allDay = time === "";
  const startsAt = londonToUtc(date, allDay ? "00:00" : time);
  if (!startsAt) return fail(allDay ? "date" : "time");

  // Repeating: every date is worked out now, up to a year ahead.
  let rule: string | null = null;
  let occurrences: Date[] = [];
  if (input.repeat !== "none") {
    const repeat = repeatFromChoice(input.repeat, date);
    if (!repeat) return fail("repeat");
    const first = new Date(`${date}T00:00:00Z`).getTime();
    const until =
      input.until || new Date(first + 182 * DAY_MS).toISOString().slice(0, 10);
    const lastAllowed = new Date(first + 366 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(until) ||
      until <= date ||
      until > lastAllowed
    ) {
      return fail("until");
    }
    // A run of days is a festival's: a month at most.
    if (
      repeat.kind === "daily" &&
      until >
        new Date(first + (MAX_DAILY_DAYS - 1) * DAY_MS)
          .toISOString()
          .slice(0, 10)
    ) {
      return fail("untilDaily");
    }
    rule = toRule(repeat, date, until);
    occurrences = occurrenceDates(rule, date).flatMap((d) => {
      const at = londonToUtc(d, allDay ? "00:00" : time);
      return at ? [at] : [];
    });
  }

  return {
    ok: true,
    event: {
      title,
      summary: summary || null,
      titleGu: titleGu || null,
      summaryGu: summaryGu || null,
      kind,
      allDay,
      startsAt,
      rule,
      occurrences,
    },
  };
}

function repeatFromChoice(choice: string, date: string): Repeat | null {
  if (choice === "daily") return { kind: "daily" };
  if (choice === "weekly") return { kind: "weekly", interval: 1 };
  if (choice === "fortnightly") return { kind: "weekly", interval: 2 };
  if (choice === "monthly") {
    const { week } = weekOfMonth(date);
    return { kind: "monthly", week: week >= 5 ? -1 : (week as 1 | 2 | 3 | 4) };
  }
  if (choice === "monthly-last") return { kind: "monthly", week: -1 };
  return null;
}

// What to tell someone when a check fails.
export const EVENT_ERRORS: Record<EventError, string> = {
  title: "Please give the event a name (2 to 120 characters).",
  summary: "Please keep the description under 280 characters.",
  titleGu: "Please keep the Gujarati name between 2 and 120 characters.",
  summaryGu: "Please keep the Gujarati description under 280 characters.",
  kind: "Please choose what kind of event it is.",
  date: "Please choose a date from today onwards, within the next two years.",
  time: "Please choose a valid start time, or leave it empty for all day.",
  repeat: "Please choose how often it repeats.",
  until:
    "Please choose an end date after the first date, and within a year of it.",
  untilDaily:
    "For an event every day, please choose a last day within a month of the first, as for a festival like Navratri.",
};

// Small formatting and grouping helpers for the public pages. Dates are
// shown in UK style and UK time, whatever the server's own time zone.

import {
  anchorFor,
  groupByRegionAndTown,
  matchesSearch,
  type RegionGroup,
  type TownGroup,
} from "@/lib/directory-format";
import type { SharedKey } from "@/lib/i18n/shared-messages";
import { londonDate, londonTime } from "@/lib/london";
import { pageLocale, sharedT } from "@/lib/i18n/locale";

const LONDON = "Europe/London";

// The page's language for dates: English (UK) or Gujarati.
const dateLocale = () => (pageLocale() === "gu" ? "gu-IN" : "en-GB");

// A date-only value (YYYY-MM-DD) as a Date at midnight UTC, so formatting in
// UTC never shifts it a day.
function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

// "Sun 8 Nov" (and the year if asked), built from parts so the result
// doesn't depend on how a given Node version punctuates dates. In
// Gujarati, "રવિ 8 નવે".
function dayLabel(at: Date, timeZone: string, withYear = false): string {
  const parts = new Intl.DateTimeFormat(dateLocale(), {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const label = `${get("weekday")} ${get("day")} ${get("month")}`;
  return withYear ? `${label} ${get("year")}` : label;
}

// The three lines of a date tile: "NOV", "8" and "Sun" (in Gujarati,
// "નવે", "8" and "રવિ"). Pass a date-only value (YYYY-MM-DD) for a day, or
// a moment for the day it falls on in the UK.
export function dateTileParts(value: string): {
  month: string;
  day: string;
  weekday: string;
} {
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parts = new Intl.DateTimeFormat(dateLocale(), {
    timeZone: dayOnly ? "UTC" : LONDON,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(dayOnly ? dateOnly(value) : new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    month: get("month").replace(/\.$/, "").toUpperCase(),
    day: get("day"),
    weekday: get("weekday").replace(/\.$/, ""),
  };
}

// "Sun 8 Nov 2026", or "Sun 11 Oct – Mon 19 Oct 2026" for a range.
export function formatDateRange(startsOn: string, endsOn: string): string {
  const start = dateOnly(startsOn);
  if (endsOn === startsOn) return dayLabel(start, "UTC", true);
  const end = dateOnly(endsOn);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${dayLabel(start, "UTC", !sameYear)} – ${dayLabel(end, "UTC", true)}`;
}

// "November 2026" for a YYYY-MM-DD date.
export function monthOf(value: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(dateOnly(value));
}

// "Sat 11 Oct, 7pm" or "Sat 11 Oct, 7:30pm" in UK time; no time when all day.
export function formatEventStart(startsAt: string, allDay: boolean): string {
  const at = new Date(startsAt);
  const day = dayLabel(at, LONDON);
  if (allDay) return day;
  if (pageLocale() === "gu") return `${day}, ${gujaratiTime(at)}`;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const minute = get("minute");
  const time = `${get("hour")}${minute === "00" ? "" : `:${minute}`}${get("dayPeriod").toLowerCase().replace(/\s/g, "")}`;
  return `${day}, ${time}`;
}

// "સાંજે 7:30" (evening 7:30) in UK time: Gujarati says the part of the
// day rather than am or pm.
function gujaratiTime(at: Date): string {
  return gujaratiClock(londonTime(at));
}

function gujaratiClock(hhmm: string): string {
  const [hour, minute] = hhmm.split(":").map(Number);
  const part =
    hour >= 4 && hour < 12
      ? "time.morning"
      : hour >= 12 && hour < 16
        ? "time.afternoon"
        : hour >= 16 && hour < 20
          ? "time.evening"
          : "time.night";
  const clock = `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}`;
  return sharedT()(part, { time: clock });
}

// A time of day given as "HH:MM" (opening and aarti times), in the
// page's language: "7:30am", "4pm"; in Gujarati "સવારે 7:30".
export function formatClock(clock: string): string {
  if (pageLocale() === "gu") return gujaratiClock(clock);
  const [hour, minute] = clock.split(":").map(Number);
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
}

// A day of the week (1 is Monday) in the page's language: "Mon" or
// "Monday", "સોમ" or "સોમવાર".
export function formatWeekday(day: number, style: "short" | "long"): string {
  // 2 November 2026 was a Monday.
  return new Intl.DateTimeFormat(dateLocale(), {
    weekday: style,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 10, 1 + day)));
}

// "7:30pm" in UK time.
function clockLabel(at: Date): string {
  return formatEventStart(at.toISOString(), false).split(", ")[1];
}

// When an event starts, for reading aloud: the day in full, as a voice
// would say it ("Saturday 24 October, 7:30pm"), in the page's language.
export function formatSpokenStart(startsAt: string, allDay: boolean): string {
  const day = new Intl.DateTimeFormat(dateLocale(), {
    timeZone: LONDON,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(startsAt));
  return allDay ? day : `${day}, ${formatTimeOfDay(startsAt, false)}`;
}

// Just the time of day, for lists already grouped by day: "7pm",
// "7:30pm", or "All day".
export function formatTimeOfDay(startsAt: string, allDay: boolean): string {
  if (allDay) return sharedT()("time.allDay");
  return formatEventStart(startsAt, false).split(", ")[1] ?? "";
}

// When an event happens, start to finish, in UK time:
// "Sat 24 Oct, 7:30pm – 11pm", "Sat 24 Oct, 10pm – Sun 25 Oct, 1am",
// "Sun 8 Nov" or "Sat 7 Nov – Sun 8 Nov" for all-day events.
export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  allDay: boolean,
): string {
  const start = formatEventStart(startsAt, allDay);
  if (!endsAt || new Date(endsAt) <= new Date(startsAt)) return start;
  if (allDay) {
    const end = formatEventStart(endsAt, true);
    return end === start ? start : `${start} – ${end}`;
  }
  const sameDay =
    londonDate(new Date(startsAt)) === londonDate(new Date(endsAt));
  return sameDay
    ? `${start} – ${clockLabel(new Date(endsAt))}`
    : `${start} – ${formatEventStart(endsAt, false)}`;
}

const CALENDARS: Record<string, string> = {
  gujarati: "Gujarati calendar",
  north_indian: "North Indian calendar",
  tamil: "Tamil calendar",
  bengali: "Bengali calendar",
  other: "Other calendars",
};

export function calendarLabel(calendar: string | null): string | null {
  if (!calendar || !(calendar in CALENDARS)) return null;
  return pageLocale() === "gu"
    ? sharedT()(`calendar.${calendar}` as SharedKey)
    : CALENDARS[calendar];
}

// "derbyhindutemple.com" for https://www.derbyhindutemple.com/
export function websiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The UTC instant for a UK wall-clock date and time ("2026-10-11", "19:00"),
// allowing for British Summer Time. Returns null for impossible values.
export function londonToUtc(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [...d.slice(1), ...t.slice(1)].map(Number);
  if (h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  // London is UTC or UTC+1: try the offset in force at that moment.
  for (const offsetHours of [1, 0]) {
    const guess = new Date(wall - offsetHours * 3_600_000);
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(guess);
    if (londonDate(guess) === date && shown === time) return guess;
  }
  // A time skipped when the clocks go forward: use the hour after.
  return new Date(wall);
}

// "0.4 miles", "3 miles", "12 miles".
export function formatMiles(miles: number): string {
  const t = sharedT();
  if (miles < 1) return t("distance.miles", { miles: miles.toFixed(1) });
  const rounded = Math.round(miles);
  return t(rounded === 1 ? "distance.mile" : "distance.miles", {
    miles: rounded,
  });
}

export {
  anchorFor,
  groupByRegionAndTown,
  londonDate,
  londonTime,
  matchesSearch,
  type RegionGroup,
  type TownGroup,
};

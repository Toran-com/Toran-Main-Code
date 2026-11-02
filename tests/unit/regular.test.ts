import { describe, expect, it } from "vitest";
import { regularGroups, weekdayName } from "@/lib/regular";
import type { ListedEvent } from "@/lib/whats-on";

const event = (over: Partial<ListedEvent>): ListedEvent => ({
  id: "e",
  title: "Bal vihar",
  title_gu: null,
  summary: null,
  kind: "class",
  confirmed_at: null,
  origin: "mandir",
  all_day: false,
  status: "published",
  recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU;UNTIL=20270301",
  link: null,
  next_starts_at: "2026-11-08T10:00:00Z",
  mandir: {
    slug: "ram",
    name: "Shree Ram Mandir",
    town: "Leicester",
    region: "East Midlands",
    latitude: null,
    longitude: null,
  },
  ...over,
});

describe("regularGroups", () => {
  it("groups repeating events by weekday, Monday first, then by time", () => {
    const days = regularGroups([
      event({ id: "sun" }),
      event({
        id: "tue-late",
        title: "Bhajan mandal",
        recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;UNTIL=20270301",
        next_starts_at: "2026-11-03T19:30:00Z",
      }),
      event({
        id: "tue-early",
        title: "Yoga",
        recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20270301",
        next_starts_at: "2026-11-03T18:00:00Z",
      }),
      event({
        id: "sat-monthly",
        title: "Satsang",
        recurrence: "RRULE:FREQ=MONTHLY;BYDAY=1SA;UNTIL=20270301",
        next_starts_at: "2026-11-07T17:00:00Z",
      }),
    ]);
    expect(days.map((d) => [d.weekday, d.events.map((e) => e.id)])).toEqual([
      [2, ["tue-early", "tue-late"]],
      [6, ["sat-monthly"]],
      [7, ["sun"]],
    ]);
  });

  it("leaves out one-offs, festival runs and cancelled events", () => {
    expect(
      regularGroups([
        event({ id: "once", recurrence: null }),
        event({
          id: "navratri",
          recurrence: "RRULE:FREQ=DAILY;UNTIL=20261020",
        }),
        event({ id: "off", status: "cancelled" }),
      ]),
    ).toEqual([]);
  });
});

describe("weekdayName", () => {
  it("names the day in the page's language", () => {
    expect(weekdayName(1, "en-GB")).toBe("Monday");
    expect(weekdayName(7, "en-GB")).toBe("Sunday");
    expect(weekdayName(4, "gu-IN")).toBe("ગુરુવાર");
  });
});

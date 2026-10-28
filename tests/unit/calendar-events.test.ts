import { describe, expect, it } from "vitest";
import {
  festivalCalendarEvents,
  mandirCalendarEvents,
} from "@/lib/calendar-events";
import type { FestivalDate, MandirEvent } from "@/lib/directory";

const event = (over: Partial<MandirEvent>): MandirEvent => ({
  id: "e1",
  title: "Diwali celebrations",
  title_gu: null,
  kind: "festival",
  summary: "Fireworks at 8pm",
  summary_gu: null,
  starts_at: "2026-11-08T18:30:00Z",
  ends_at: null,
  all_day: false,
  location_note: "Main hall",
  cost_note: "Free",
  link: null,
  status: "published",
  confirmed_at: null,
  recurrence: null,
  origin: null,
  next_starts_at: "2026-11-08T18:30:00Z",
  ...over,
});

const mandir = (events: MandirEvent[]) => ({
  slug: "ram",
  name: "Shree Ram Mandir",
  town: "Leicester",
  postcode: "LE4 6AR",
  events,
});

describe("mandirCalendarEvents", () => {
  it("describes an event with where it is and a link back", () => {
    const [entry] = mandirCalendarEvents(
      mandir([event({})]),
      "https://toran.example",
    );
    expect(entry).toMatchObject({
      uid: "event-e1@toran",
      title: "Diwali celebrations",
      location: "Shree Ram Mandir, Leicester, LE4 6AR",
      url: "https://toran.example/mandirs/ram/events/e1",
      start: "2026-11-08T18:30:00Z",
      allDay: false,
      cancelled: false,
    });
    expect(entry.description).toContain("Fireworks at 8pm");
    expect(entry.description).toContain("Main hall · Free");
  });

  it("gives all-day events their UK date, even in summer time", () => {
    // Midnight in London in October is 11pm the day before in UTC.
    const [entry] = mandirCalendarEvents(
      mandir([
        event({
          all_day: true,
          starts_at: "2026-10-19T23:00:00Z",
          next_starts_at: "2026-10-19T23:00:00Z",
        }),
      ]),
      "https://toran.example",
    );
    expect(entry.start).toBe("2026-10-20");
  });

  it("skips a repeating event's cancelled dates", () => {
    const [entry] = mandirCalendarEvents(
      mandir([
        event({
          recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131",
          event_occurrences: [
            { starts_at: "2026-10-20T18:00:00Z", cancelled: false },
            { starts_at: "2026-10-27T19:00:00Z", cancelled: true },
          ],
        }),
      ]),
      "https://toran.example",
    );
    expect(entry.rule).toContain("FREQ=WEEKLY");
    expect(entry.skip).toEqual(["2026-10-27T19:00:00Z"]);
  });
});

describe("festivalCalendarEvents", () => {
  const date = (over: Partial<FestivalDate>): FestivalDate => ({
    id: "d1",
    calendar: null,
    starts_on: "2026-11-08",
    ends_on: "2026-11-08",
    verified: true,
    source: null,
    festival: { slug: "diwali", name: "Diwali", summary: "Festival of lights" },
    ...over,
  });

  it("makes all-day entries, naming the calendar where it differs", () => {
    const [plain, gujarati] = festivalCalendarEvents(
      [date({}), date({ id: "d2", calendar: "gujarati", verified: false })],
      "https://toran.example",
    );
    expect(plain).toMatchObject({
      uid: "festival-d1@toran",
      title: "Diwali",
      allDay: true,
      start: "2026-11-08",
      url: "https://toran.example/festivals/diwali",
    });
    expect(plain.description).not.toContain("may vary");
    expect(gujarati.title).toMatch(/^Diwali \(.+\)$/);
    expect(gujarati.description).toContain("Date may vary");
  });

  it("leaves out dates with no festival", () => {
    expect(
      festivalCalendarEvents([date({ festival: null })], "https://x"),
    ).toEqual([]);
  });
});

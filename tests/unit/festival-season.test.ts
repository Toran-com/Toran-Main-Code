import { describe, expect, it } from "vitest";
import type { FestivalDate } from "@/lib/directory";
import {
  DIWALI,
  seasonCalendarEvents,
  seasonDays,
  seasonEvents,
  seasonWindow,
  showSeasonBanner,
} from "@/lib/festival-season";
import type { ListedEvent } from "@/lib/whats-on";

function date(
  slug: string,
  name: string,
  starts_on: string,
  calendar: FestivalDate["calendar"] = null,
): FestivalDate {
  return {
    id: `${slug}-${starts_on}-${calendar}`,
    calendar,
    starts_on,
    ends_on: starts_on,
    verified: false,
    source: "test",
    festival: { slug, name, summary: null },
  };
}

const DATES = [
  date("navratri", "Navratri", "2026-10-11"),
  date("dhanteras", "Dhanteras", "2026-11-06"),
  date("diwali", "Diwali", "2026-11-08"),
  date("annakut", "Annakut and New Year", "2026-11-09", "north_indian"),
  date("annakut", "Annakut and New Year", "2026-11-10", "gujarati"),
  date("bhai-dooj", "Bhai Dooj", "2026-11-11"),
  date("diwali", "Diwali", "2027-10-29"),
];

function event(
  title: string,
  at: string,
  overrides: Partial<ListedEvent> = {},
): ListedEvent {
  return {
    id: title.toLowerCase().replace(/\W+/g, "-"),
    title,
    title_gu: null,
    summary: null,
    kind: "other",
    confirmed_at: null,
    origin: "mandir",
    all_day: false,
    status: "published",
    recurrence: null,
    link: null,
    next_starts_at: at,
    mandir: {
      slug: "shree-mandir",
      name: "Shree Mandir",
      town: "Leicester",
      region: "East Midlands",
      latitude: null,
      longitude: null,
    },
    ...overrides,
  };
}

describe("seasonDays", () => {
  it("finds this year's Diwali week, preferring the Gujarati Annakut", () => {
    const days = seasonDays(DATES, DIWALI, "2026-10-19");
    expect(days.map((d) => [d.slug, d.starts_on])).toEqual([
      ["dhanteras", "2026-11-06"],
      ["diwali", "2026-11-08"],
      ["annakut", "2026-11-10"],
      ["bhai-dooj", "2026-11-11"],
    ]);
    expect(seasonWindow(days)).toEqual({
      from: "2026-11-06",
      to: "2026-11-11",
    });
  });

  it("moves on to next year once this year's has passed", () => {
    const days = seasonDays(DATES, DIWALI, "2026-11-12");
    expect(days.map((d) => d.starts_on)).toEqual(["2027-10-29"]);
  });

  it("is empty when Diwali has no date yet", () => {
    expect(seasonDays(DATES.slice(0, 1), DIWALI, "2026-10-19")).toEqual([]);
    expect(seasonWindow([])).toBeNull();
  });
});

describe("seasonEvents", () => {
  const window = { from: "2026-11-06", to: "2026-11-11" };
  it("keeps the season's events on its days", () => {
    const kept = seasonEvents(
      [
        event("Diwali Lakshmi puja", "2026-11-08T18:00:00Z"),
        event("Annakut darshan", "2026-11-10T11:00:00Z"),
        event("Fireworks", "2026-11-07T19:00:00Z", { kind: "festival" }),
        event("Bestu Varas", "2026-11-10T09:00:00Z"),
        event("Youth quiz", "2026-11-08T14:00:00Z"),
        event("Diwali social", "2026-11-20T18:00:00Z"),
      ],
      DIWALI,
      window,
    );
    expect(kept.map((e) => e.title)).toEqual([
      "Diwali Lakshmi puja",
      "Annakut darshan",
      "Fireworks",
      "Bestu Varas",
    ]);
  });
});

describe("showSeasonBanner", () => {
  const days = seasonDays(DATES, DIWALI, "2026-10-19");
  it("shows from six weeks before Diwali until Bhai Dooj", () => {
    expect(showSeasonBanner(days, DIWALI, "2026-09-20")).toBe(false);
    expect(showSeasonBanner(days, DIWALI, "2026-10-19")).toBe(true);
    expect(showSeasonBanner(days, DIWALI, "2026-11-11")).toBe(true);
    expect(showSeasonBanner(days, DIWALI, "2026-11-12")).toBe(false);
    expect(showSeasonBanner([], DIWALI, "2026-10-19")).toBe(false);
  });
});

describe("seasonCalendarEvents", () => {
  it("puts the mandir in the title and links to the event", () => {
    const [entry, allDay] = seasonCalendarEvents(
      [
        event("Lakshmi puja", "2026-11-08T18:00:00Z"),
        event("Annakut", "2026-11-10T00:00:00Z", { all_day: true }),
        event("Called off", "2026-11-08T18:00:00Z", { status: "cancelled" }),
      ],
      DIWALI,
      "https://toran.example",
    );
    expect(entry).toMatchObject({
      title: "Lakshmi puja · Shree Mandir",
      location: "Shree Mandir, Leicester",
      url: "https://toran.example/mandirs/shree-mandir/events/lakshmi-puja",
      start: "2026-11-08T18:00:00Z",
      allDay: false,
    });
    expect(allDay).toMatchObject({ start: "2026-11-10", allDay: true });
  });
});

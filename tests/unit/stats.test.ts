import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEASONS } from "@/lib/seasons";
import {
  countablePath,
  isBot,
  isMetric,
  mandirSlugOf,
  pageKind,
  periodDays,
  readSummary,
  summarise,
} from "@/lib/stats";

const EVENT =
  "/mandirs/reading-hindu-temple/events/0b2c3d4e-0000-4000-8000-000000000001";

describe("countablePath", () => {
  it("counts public pages, without query, fragment or trailing slash", () => {
    expect(countablePath("/")).toBe("/");
    expect(countablePath("/whats-on?kind=festival#top")).toBe("/whats-on");
    expect(countablePath("/mandirs/Reading-Hindu-Temple/")).toBe(
      "/mandirs/reading-hindu-temple",
    );
    expect(countablePath(EVENT)).toBe(EVENT);
    expect(countablePath(`${EVENT}/seva`)).toBe(`${EVENT}/seva`);
    expect(countablePath("/festivals/diwali")).toBe("/festivals/diwali");
    expect(countablePath("/for-mandirs/guide")).toBe("/for-mandirs/guide");
  });

  it("leaves out admin, committee and made-up pages", () => {
    expect(countablePath("/ops")).toBeNull();
    expect(countablePath("/manage/reading-hindu-temple")).toBeNull();
    expect(countablePath("/account")).toBeNull();
    expect(countablePath("/mandirs/x/events/not-an-id")).toBeNull();
    expect(countablePath("/mandirs/x/calendar.ics")).toBeNull();
    expect(countablePath(42)).toBeNull();
    expect(countablePath(`/mandirs/${"a".repeat(300)}`)).toBeNull();
  });
});

describe("page kinds", () => {
  it("names each kind of page and finds its mandir", () => {
    expect(pageKind("/")).toBe("Home");
    expect(pageKind(EVENT)).toBe("Event pages");
    expect(pageKind(`${EVENT}/seva`)).toBe("Seva sign-up pages");
    expect(mandirSlugOf(EVENT)).toBe("reading-hindu-temple");
    expect(mandirSlugOf("/mandirs")).toBeNull();
    expect(isMetric("share")).toBe(true);
    expect(isMetric("click")).toBe(false);
  });
});

describe("isBot", () => {
  it("skips search engines, link previews and test browsers", () => {
    expect(isBot(null)).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ),
    ).toBe(true);
    expect(isBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/140.0 Safari/537.36",
      ),
    ).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("summarise", () => {
  const period = periodDays("2026-10-18", 3);

  it("covers every day of the period", () => {
    expect(period).toEqual(["2026-10-16", "2026-10-17", "2026-10-18"]);
  });

  it("adds up totals, days, page kinds, mandirs and events", () => {
    const stats = summarise(
      readSummary({
        days: [
          { day: "2026-10-16", metric: "view", count: 5 },
          { day: "2026-10-18", metric: "view", count: 7 },
          { day: "2026-10-18", metric: "share", count: 2 },
          { day: "2026-10-01", metric: "view", count: 100 },
          { day: "2026-10-18", metric: "bogus", count: 9 },
        ],
        paths: [
          { path: "/whats-on", metric: "view", count: 4 },
          { path: "/mandirs/reading-hindu-temple", metric: "view", count: 3 },
          { path: EVENT, metric: "view", count: 5 },
          { path: EVENT, metric: "calendar", count: 1 },
          { path: EVENT, metric: "share", count: 2 },
          { path: "/mandirs/leeds", metric: "view", count: 1 },
        ],
      }),
      period,
    );
    expect(stats.totals).toEqual({
      view: 12,
      calendar: 0,
      subscribe: 0,
      share: 2,
    });
    expect(stats.byDay).toEqual([
      { day: "2026-10-16", views: 5 },
      { day: "2026-10-17", views: 0 },
      { day: "2026-10-18", views: 7 },
    ]);
    expect(stats.byKind).toEqual([
      { kind: "Event pages", views: 5 },
      { kind: "What's on", views: 4 },
      { kind: "Mandir pages", views: 4 },
    ]);
    expect(stats.byMandir).toEqual([
      {
        slug: "reading-hindu-temple",
        views: 8,
        calendar: 1,
        subscribe: 0,
        share: 2,
      },
      { slug: "leeds", views: 1, calendar: 0, subscribe: 0, share: 0 },
    ]);
    expect(stats.byEvent).toEqual([{ path: EVENT, views: 5 }]);
  });

  it("copes with nothing, or something malformed, from the database", () => {
    expect(readSummary(null)).toEqual({ days: [], paths: [] });
    expect(readSummary({ days: [{ day: "x" }], paths: "no" })).toEqual({
      days: [],
      paths: [],
    });
  });
});

describe("festival season pages", () => {
  it("are counted, by name", () => {
    expect(countablePath("/holi")).toBe("/holi");
    expect(pageKind("/navratri")).toBe("Navratri page");
    expect(pageKind("/diwali")).toBe("Diwali page");
  });

  it("are the same pages the database will count", () => {
    // The newest migration that defines count_visit lists the season pages.
    const dir = "supabase/migrations";
    const latest = readdirSync(dir)
      .filter((f) =>
        readFileSync(`${dir}/${f}`, "utf8").includes("count_visit"),
      )
      .sort()
      .at(-1)!;
    const sql = readFileSync(`${dir}/${latest}`, "utf8");
    const listed = /'\^\/\(([a-z|-]+)\)\$'/.exec(sql)?.[1].split("|");
    expect(listed?.sort()).toEqual(SEASONS.map((s) => s.slug).sort());
  });
});

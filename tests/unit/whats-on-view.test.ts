import { describe, expect, it } from "vitest";
import { mentionsFestival } from "@/lib/festival-words";
import {
  dayFrom,
  dayHeading,
  groupByDay,
  nearestFirstEachDay,
  nearTo,
  onDay,
  radiusFrom,
  regionCounts,
} from "@/lib/whats-on-view";
import type { ListedEvent } from "@/lib/whats-on";

const event = (
  id: string,
  next: string,
  where: { latitude: number | null; longitude: number | null },
): ListedEvent => ({
  id,
  title: id,
  title_gu: null,
  summary: null,
  kind: "other",
  confirmed_at: null,
  origin: null,
  all_day: false,
  status: "published",
  recurrence: null,
  link: null,
  next_starts_at: next,
  mandir: { slug: id, name: id, town: "T", region: "R", ...where },
});

const leicester = { latitude: 52.6369, longitude: -1.1398 };
const london = { latitude: 51.5074, longitude: -0.1278 };

describe("nearTo", () => {
  const events = [
    event("leicester", "2026-10-17T18:00:00Z", leicester),
    event("london", "2026-10-17T19:00:00Z", london),
    event("unmapped", "2026-10-17T20:00:00Z", {
      latitude: null,
      longitude: null,
    }),
  ];
  it("keeps events within the distance, with miles", () => {
    const near = nearTo(events, { latitude: 52.64, longitude: -1.13 }, 15);
    expect(near.map((e) => e.id)).toEqual(["leicester"]);
    expect(near[0].miles).toBeLessThan(1);
  });
  it("keeps everything when there's no postcode", () => {
    expect(nearTo(events, null, 15)).toHaveLength(3);
  });
});

describe("days", () => {
  const now = new Date("2026-10-13T09:00:00Z");
  it("names today and tomorrow in UK time", () => {
    expect(dayHeading("2026-10-13T23:30:00Z", now)).toBe("Tomorrow"); // 00.30 BST on the 14th
    expect(dayHeading("2026-10-13T18:00:00Z", now)).toBe("Today");
    expect(dayHeading("2026-10-17T18:00:00Z", now)).toBe("Saturday 17 October");
  });
  it("groups events by day", () => {
    const groups = groupByDay(
      [
        { next_starts_at: "2026-10-13T10:00:00Z" },
        { next_starts_at: "2026-10-13T18:00:00Z" },
        { next_starts_at: "2026-10-17T18:00:00Z" },
      ],
      now,
    );
    expect(groups.map((g) => [g.day, g.heading, g.events.length])).toEqual([
      ["2026-10-13", "Today", 2],
      ["2026-10-17", "Saturday 17 October", 1],
    ]);
  });
  it("keeps a chosen day only if it's a real date", () => {
    expect(dayFrom("2026-11-08")).toBe("2026-11-08");
    expect(dayFrom("2026-13-40")).toBe("");
    expect(dayFrom("8 Nov")).toBe("");
    expect(dayFrom(undefined)).toBe("");
  });
  it("picks one day's events, in UK time", () => {
    const events = [
      { next_starts_at: "2026-11-07T23:30:00Z" }, // 23.30 on the 7th (GMT)
      { next_starts_at: "2026-11-08T10:00:00Z" },
      { next_starts_at: "2026-11-09T10:00:00Z" },
    ];
    expect(onDay(events, "2026-11-08")).toEqual([events[1]]);
    expect(onDay(events, "")).toEqual(events);
  });
  it("counts events by area, most first", () => {
    const at = (region: string) => ({ mandir: { region } });
    expect(
      regionCounts([
        at("London"),
        at("Wales"),
        at("London"),
        at("East Midlands"),
      ]),
    ).toEqual([
      { region: "London", count: 2 },
      { region: "East Midlands", count: 1 },
      { region: "Wales", count: 1 },
    ]);
  });
  it("only allows the offered distances", () => {
    expect(radiusFrom("30")).toBe(30);
    expect(radiusFrom("999")).toBe(15);
  });
});

describe("mentionsFestival", () => {
  it("recognises festival words", () => {
    expect(mentionsFestival("navratri", "Garba night with live band")).toBe(
      true,
    );
    expect(mentionsFestival("diwali", "Deepavali celebrations")).toBe(true);
    expect(mentionsFestival("diwali", "Weekly aarti")).toBe(false);
    expect(mentionsFestival("navratri", "Three Garbas this week")).toBe(true);
  });

  it("matches whole words only", () => {
    expect(mentionsFestival("holi", "Holi milan")).toBe(true);
    expect(mentionsFestival("holi", "School holiday club")).toBe(false);
    expect(mentionsFestival("holi", "Holidays")).toBe(false);
    expect(mentionsFestival("navratri", "Garbage collection")).toBe(false);
    expect(
      mentionsFestival("raksha-bandhan", "Rakhi making for children"),
    ).toBe(true);
  });
});

describe("nearestFirstEachDay", () => {
  it("keeps the days in order, nearest first within each", () => {
    const at = { latitude: 52.64, longitude: -1.13 };
    const sorted = nearestFirstEachDay(
      nearTo(
        [
          event("london-sat", "2026-10-17T10:00:00Z", london),
          event("leicester-sat", "2026-10-17T19:00:00Z", leicester),
          event("london-sun", "2026-10-18T09:00:00Z", london),
          event("leicester-sun", "2026-10-18T20:00:00Z", leicester),
        ],
        at,
        200,
      ),
    );
    expect(sorted.map((e) => e.id)).toEqual([
      "leicester-sat",
      "london-sat",
      "leicester-sun",
      "london-sun",
    ]);
  });
});

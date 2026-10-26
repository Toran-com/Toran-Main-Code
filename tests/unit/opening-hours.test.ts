import { describe, expect, it } from "vitest";
import {
  londonNow,
  openState,
  parseHours,
  type Session,
  weekRows,
} from "@/lib/opening-hours";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

// Weekdays 7:30–12 and 4–8pm; weekends 7am–9pm.
const week: Session[] = [
  ...([1, 2, 3, 4, 5] as const).flatMap((day) => [
    { day, opens: "07:30", closes: "12:00" },
    { day, opens: "16:00", closes: "20:00" },
  ]),
  { day: 6, opens: "07:00", closes: "21:00" },
  { day: 7, opens: "07:00", closes: "21:00" },
];

// Monday 26 October 2026 (GMT, after the clocks went back).
const at = (time: string, date = "2026-10-26") => new Date(`${date}T${time}Z`);

describe("the time in London", () => {
  it("knows the day of the week, in summer time too", () => {
    expect(londonNow(at("10:00"))).toEqual({ day: 1, clock: "10:00" });
    // Saturday 24 October, 11:30pm UTC is already Sunday in London (BST).
    expect(londonNow(new Date("2026-10-24T23:30:00Z"))).toEqual({
      day: 7,
      clock: "00:30",
    });
  });
});

describe("open now", () => {
  it("says until when, while it's open", () => {
    expect(openState(week, at("09:15"))).toEqual({
      open: true,
      closes: "12:00",
    });
  });
  it("says when it opens again later today", () => {
    expect(openState(week, at("13:00"))).toEqual({
      open: false,
      opens: "16:00",
      day: 1,
      inDays: 0,
    });
  });
  it("looks to tomorrow after the last session", () => {
    expect(openState(week, at("20:00"))).toEqual({
      open: false,
      opens: "07:30",
      day: 2,
      inDays: 1,
    });
  });
  it("skips closed days", () => {
    const sundays: Session[] = [{ day: 7, opens: "10:00", closes: "13:00" }];
    expect(openState(sundays, at("09:00"))).toEqual({
      open: false,
      opens: "10:00",
      day: 7,
      inDays: 6,
    });
    // Next Sunday, after this Sunday's session has finished.
    expect(openState(sundays, at("14:00", "2026-11-01"))).toMatchObject({
      day: 7,
      inDays: 7,
    });
  });
  it("says nothing when no times are given", () => {
    expect(openState([], at("09:00"))).toBeNull();
  });
});

describe("the week, for the page", () => {
  it("runs days with the same times together", () => {
    expect(weekRows(week)).toEqual([
      {
        from: 1,
        to: 5,
        sessions: [
          { opens: "07:30", closes: "12:00" },
          { opens: "16:00", closes: "20:00" },
        ],
      },
      { from: 6, to: 7, sessions: [{ opens: "07:00", closes: "21:00" }] },
    ]);
  });
  it("shows closed days", () => {
    const rows = weekRows([{ day: 3, opens: "18:00", closes: "20:00" }]);
    expect(rows.map((r) => [r.from, r.to, r.sessions.length])).toEqual([
      [1, 2, 0],
      [3, 3, 1],
      [4, 7, 0],
    ]);
  });
});

describe("the committee's form", () => {
  it("reads sessions and aarti times, in order", () => {
    const parsed = parseHours(
      form({
        "open-1-0": "16:00",
        "close-1-0": "20:00",
        "open-1-1": "07:30",
        "close-1-1": "12:00",
        "aarti-name-0": "Sandhya aarti",
        "aarti-time-0": "19:00",
        "aarti-name-1": "Mangla aarti",
        "aarti-time-1": "07:30",
        "aarti-time-2": "12:00",
      }),
    );
    expect(parsed).toEqual({
      ok: true,
      sessions: [
        { day: 1, opens: "07:30", closes: "12:00" },
        { day: 1, opens: "16:00", closes: "20:00" },
      ],
      aartis: [
        { name: "Mangla aarti", time: "07:30" },
        { name: "Aarti", time: "12:00" },
        { name: "Sandhya aarti", time: "19:00" },
      ],
    });
  });
  it("refuses half a session, or closing before opening", () => {
    expect(parseHours(form({ "open-2-0": "07:30" }))).toEqual({
      ok: false,
      error: "hours",
      day: 2,
    });
    expect(
      parseHours(form({ "open-3-0": "20:00", "close-3-0": "07:00" })),
    ).toEqual({ ok: false, error: "hours", day: 3 });
  });
  it("refuses sessions that overlap", () => {
    expect(
      parseHours(
        form({
          "open-4-0": "07:00",
          "close-4-0": "13:00",
          "open-4-1": "12:00",
          "close-4-1": "18:00",
        }),
      ),
    ).toEqual({ ok: false, error: "hours", day: 4 });
  });
  it("refuses an aarti without a time", () => {
    expect(parseHours(form({ "aarti-name-0": "Shayan aarti" }))).toEqual({
      ok: false,
      error: "aarti",
    });
  });
  it("allows everything to be left empty", () => {
    expect(parseHours(form({}))).toEqual({
      ok: true,
      sessions: [],
      aartis: [],
    });
  });
});

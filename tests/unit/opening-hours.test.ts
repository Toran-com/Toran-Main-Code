import { describe, expect, it } from "vitest";
import {
  aartiDaysChoice,
  dayRuns,
  londonNow,
  openState,
  parseHours,
  readAartis,
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
  it("reads the days each aarti is on", () => {
    const f = form({
      "aarti-name-0": "Mangla aarti",
      "aarti-time-0": "09:30",
      "aarti-days-0": "all",
      "aarti-name-1": "Sandhya aarti",
      "aarti-time-1": "18:00",
      "aarti-days-1": "1-6",
      "aarti-name-2": "Sandhya aarti",
      "aarti-time-2": "16:30",
      "aarti-days-2": "7",
      "aarti-name-3": "Bhajan aarti",
      "aarti-time-3": "20:00",
      "aarti-days-3": "custom",
    });
    f.append("aarti-day-3", "5");
    f.append("aarti-day-3", "2");
    expect(parseHours(f)).toEqual({
      ok: true,
      sessions: [],
      aartis: [
        { name: "Mangla aarti", time: "09:30" },
        { name: "Sandhya aarti", time: "16:30", days: [7] },
        { name: "Sandhya aarti", time: "18:00", days: [1, 2, 3, 4, 5, 6] },
        { name: "Bhajan aarti", time: "20:00", days: [2, 5] },
      ],
    });
  });
  it("refuses an aarti on no days", () => {
    expect(
      parseHours(
        form({
          "aarti-name-0": "Sandhya aarti",
          "aarti-time-0": "18:00",
          "aarti-days-0": "custom",
        }),
      ),
    ).toEqual({ ok: false, error: "aarti" });
  });
  it("allows everything to be left empty", () => {
    expect(parseHours(form({}))).toEqual({
      ok: true,
      sessions: [],
      aartis: [],
    });
  });
});

describe("aarti days", () => {
  it("reads what the database keeps, every day when no days are given", () => {
    expect(
      readAartis([
        { name: "Mangla aarti", time: "07:30" },
        { name: "Sandhya aarti", time: "18:00", days: [6, 1, 9, 2] },
        { name: "Shayan aarti", time: "20:00", days: [1, 2, 3, 4, 5, 6, 7] },
      ]),
    ).toEqual([
      { name: "Mangla aarti", time: "07:30" },
      { name: "Sandhya aarti", time: "18:00", days: [1, 2, 6] },
      { name: "Shayan aarti", time: "20:00" },
    ]);
  });
  it("chooses the form's choice for the days", () => {
    expect(aartiDaysChoice({})).toBe("all");
    expect(aartiDaysChoice({ days: [1, 2, 3, 4, 5, 6] })).toBe("1-6");
    expect(aartiDaysChoice({ days: [7] })).toBe("7");
    expect(aartiDaysChoice({ days: [2, 5] })).toBe("custom");
  });
  it("runs days in a row together", () => {
    expect(dayRuns([1, 2, 3, 4, 5, 6])).toEqual([[1, 6]]);
    expect(dayRuns([6, 7])).toEqual([
      [6, 6],
      [7, 7],
    ]);
    expect(dayRuns([5, 1, 3, 2])).toEqual([
      [1, 3],
      [5, 5],
    ]);
  });
});

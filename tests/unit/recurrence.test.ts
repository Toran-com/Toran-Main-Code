import { describe, expect, it } from "vitest";
import {
  describeRule,
  occurrenceDates,
  parseRule,
  toRule,
  weekOfMonth,
} from "@/lib/recurrence";

describe("rules", () => {
  it("writes and reads weekly and fortnightly rules", () => {
    const rule = toRule(
      { kind: "weekly", interval: 1 },
      "2026-10-17",
      "2026-12-31",
    );
    expect(rule).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261231");
    expect(describeRule(rule)).toBe("Every Saturday");
    expect(
      describeRule(
        toRule({ kind: "weekly", interval: 2 }, "2026-10-18", "2026-12-31"),
      ),
    ).toBe("Every other Sunday");
  });
  it("writes and reads monthly rules", () => {
    const first = toRule(
      { kind: "monthly", week: 1 },
      "2026-11-07",
      "2027-03-31",
    );
    expect(first).toBe("RRULE:FREQ=MONTHLY;BYDAY=1SA;UNTIL=20270331");
    expect(describeRule(first)).toBe("First Saturday of the month");
    expect(
      describeRule(
        toRule({ kind: "monthly", week: -1 }, "2026-10-30", "2027-03-31"),
      ),
    ).toBe("Last Friday of the month");
  });
  it("rejects rules it doesn't understand", () => {
    expect(parseRule("RRULE:FREQ=YEARLY;UNTIL=20261231")).toBeNull();
    expect(parseRule("RRULE:FREQ=WEEKLY;BYDAY=SA")).toBeNull();
    expect(describeRule("nonsense")).toBeNull();
  });
});

describe("occurrenceDates", () => {
  it("lists every Saturday up to the end date", () => {
    const rule = toRule(
      { kind: "weekly", interval: 1 },
      "2026-10-17",
      "2026-11-07",
    );
    expect(occurrenceDates(rule, "2026-10-17")).toEqual([
      "2026-10-17",
      "2026-10-24",
      "2026-10-31",
      "2026-11-07",
    ]);
  });
  it("lists every other Sunday", () => {
    const rule = toRule(
      { kind: "weekly", interval: 2 },
      "2026-10-18",
      "2026-11-30",
    );
    expect(occurrenceDates(rule, "2026-10-18")).toEqual([
      "2026-10-18",
      "2026-11-01",
      "2026-11-15",
      "2026-11-29",
    ]);
  });
  it("finds the first and last Saturday of each month", () => {
    const first = toRule(
      { kind: "monthly", week: 1 },
      "2026-11-07",
      "2027-01-31",
    );
    expect(occurrenceDates(first, "2026-11-07")).toEqual([
      "2026-11-07",
      "2026-12-05",
      "2027-01-02",
    ]);
    const last = toRule(
      { kind: "monthly", week: -1 },
      "2026-10-31",
      "2027-01-31",
    );
    expect(occurrenceDates(last, "2026-10-31")).toEqual([
      "2026-10-31",
      "2026-11-28",
      "2026-12-26",
      "2027-01-30",
    ]);
  });
  it("stops at 60 dates", () => {
    const rule = toRule(
      { kind: "weekly", interval: 1 },
      "2026-10-17",
      "2030-01-01",
    );
    expect(occurrenceDates(rule, "2026-10-17")).toHaveLength(60);
  });
});

describe("weekOfMonth", () => {
  it("says which week of the month a date is in", () => {
    expect(weekOfMonth("2026-10-03")).toEqual({ week: 1, last: false });
    expect(weekOfMonth("2026-10-31")).toEqual({ week: 5, last: true });
    expect(weekOfMonth("2026-10-24")).toEqual({ week: 4, last: false });
  });
});

describe("a festival's run of days", () => {
  it("writes, reads and describes an every-day rule", () => {
    const rule = toRule({ kind: "daily" }, "2026-10-02", "2026-10-10");
    expect(rule).toBe("RRULE:FREQ=DAILY;UNTIL=20261010");
    expect(parseRule(rule)?.repeat).toEqual({ kind: "daily" });
    expect(describeRule(rule)).toBe("Every day until Sat 10 Oct");
  });

  it("lists every night, from the first to the last", () => {
    const rule = toRule({ kind: "daily" }, "2026-10-02", "2026-10-10");
    const dates = occurrenceDates(rule, "2026-10-02");
    expect(dates).toHaveLength(9);
    expect(dates[0]).toBe("2026-10-02");
    expect(dates.at(-1)).toBe("2026-10-10");
  });
});

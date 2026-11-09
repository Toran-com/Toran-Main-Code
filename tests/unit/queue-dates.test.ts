import { describe, expect, it } from "vitest";
import { bySoonest, hasPassed, lastDate } from "@/lib/queue-dates";

const one = (date: string) => ({ date, repeat: "", until: "" });

describe("queue dates", () => {
  it("a one-off event has passed once its day is over", () => {
    expect(hasPassed(one("2026-11-08"), "2026-11-09")).toBe(true);
    expect(hasPassed(one("2026-11-09"), "2026-11-09")).toBe(false);
    expect(hasPassed(one("2026-11-10"), "2026-11-09")).toBe(false);
  });

  it("a repeating event has passed only when its repeats have ended", () => {
    const weekly = { date: "2026-01-04", repeat: "weekly", until: "" };
    expect(lastDate(weekly)).toBeNull();
    expect(hasPassed(weekly, "2026-11-09")).toBe(false);
    expect(hasPassed({ ...weekly, until: "2026-11-01" }, "2026-11-09")).toBe(
      true,
    );
    expect(hasPassed({ ...weekly, until: "2026-12-31" }, "2026-11-09")).toBe(
      false,
    );
  });

  it("something with no date is never treated as passed", () => {
    expect(hasPassed(one(""), "2026-11-09")).toBe(false);
  });

  it("sorts soonest first, undated last", () => {
    const items = [one("2026-12-01"), one(""), one("2026-11-10")];
    expect(items.sort(bySoonest).map((i) => i.date)).toEqual([
      "2026-11-10",
      "2026-12-01",
      "",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { cleanEventIds, parsePlan, planHref } from "@/lib/plan";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";

describe("the family's plan", () => {
  it("keeps only real event ids from the address, each once", () => {
    expect(cleanEventIds(`${a},nonsense,${b.toUpperCase()},${a}`)).toEqual([
      a,
      b,
    ]);
    expect(cleanEventIds(undefined)).toEqual([]);
    expect(cleanEventIds(Array(40).fill(a).join(","))).toEqual([a]);
  });

  it("drops events that have already happened, and sorts by date", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const stored = JSON.stringify([
      { id: b, at: "2026-11-08T18:00:00Z" },
      { id: a, at: "2026-10-26T09:00:00Z" },
      {
        id: "33333333-3333-4333-8333-333333333333",
        at: "2026-10-20T18:00:00Z",
      },
      { id: b, at: "2026-11-08T18:00:00Z" },
      { id: "not-an-id", at: "2026-11-01T18:00:00Z" },
    ]);
    // Earlier today still counts: it may not have finished.
    expect(parsePlan(stored, now)).toEqual([
      { id: a, at: "2026-10-26T09:00:00Z" },
      { id: b, at: "2026-11-08T18:00:00Z" },
    ]);
  });

  it("copes with nothing saved, or something broken", () => {
    expect(parsePlan("")).toEqual([]);
    expect(parsePlan("{oops")).toEqual([]);
    expect(parsePlan('{"id":1}')).toEqual([]);
  });

  it("has an address anyone can open", () => {
    expect(planHref("en", [a, b])).toBe(`/plan?events=${a},${b}`);
    expect(planHref("gu", [a])).toBe(`/gu/plan?events=${a}`);
    expect(planHref("en", [])).toBe("/plan");
  });
});

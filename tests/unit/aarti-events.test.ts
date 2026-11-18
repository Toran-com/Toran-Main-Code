import { describe, expect, it } from "vitest";
import { firstAndRepeat, planAartiEvents } from "@/lib/aarti-events";

const today = "2026-11-18";
const mangla = { name: "Mangla aarti", time: "07:00" };
const sandhya = { name: "Sandhya aarti", time: "19:00" };

describe("planAartiEvents", () => {
  it("adds an event for each new aarti", () => {
    expect(planAartiEvents([mangla, sandhya], [], today)).toEqual({
      keep: [],
      remove: [],
      add: [mangla, sandhya],
    });
  });

  it("keeps an aarti that hasn't changed", () => {
    expect(
      planAartiEvents(
        [mangla],
        [
          {
            id: "a",
            title: "Mangla aarti",
            time: "07:00",
            until: "2027-11-18",
          },
        ],
        today,
      ),
    ).toEqual({ keep: ["a"], remove: [], add: [] });
  });

  it("replaces one whose time changed, and takes off one no longer given", () => {
    expect(
      planAartiEvents(
        [{ ...mangla, time: "06:30" }],
        [
          {
            id: "a",
            title: "Mangla aarti",
            time: "07:00",
            until: "2027-11-18",
          },
          {
            id: "b",
            title: "Sandhya aarti",
            time: "19:00",
            until: "2027-11-18",
          },
        ],
        today,
      ),
    ).toEqual({
      keep: [],
      remove: ["a", "b"],
      add: [{ name: "Mangla aarti", time: "06:30" }],
    });
  });

  it("renews one with less than a month left", () => {
    expect(
      planAartiEvents(
        [mangla],
        [
          {
            id: "a",
            title: "Mangla aarti",
            time: "07:00",
            until: "2026-12-10",
          },
        ],
        today,
      ),
    ).toEqual({ keep: [], remove: ["a"], add: [mangla] });
  });

  it("takes everything off when the aarti times are cleared", () => {
    expect(
      planAartiEvents(
        [],
        [
          {
            id: "a",
            title: "Mangla aarti",
            time: "07:00",
            until: "2027-11-18",
          },
        ],
        today,
      ),
    ).toEqual({ keep: [], remove: ["a"], add: [] });
  });
});

describe("aartis on some days", () => {
  const evening = {
    name: "Sandhya aarti",
    time: "18:00",
    days: [1, 2, 3, 4, 5, 6] as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
  };
  it("replaces one whose days changed", () => {
    expect(
      planAartiEvents(
        [evening],
        [
          {
            id: "a",
            title: "Sandhya aarti",
            time: "18:00",
            until: "2027-11-18",
          },
        ],
        today,
      ),
    ).toEqual({ keep: [], remove: ["a"], add: [evening] });
  });
  it("keeps one on the same days", () => {
    expect(
      planAartiEvents(
        [evening],
        [
          {
            id: "a",
            title: "Sandhya aarti",
            time: "18:00",
            until: "2027-11-18",
            days: [1, 2, 3, 4, 5, 6],
          },
        ],
        today,
      ),
    ).toEqual({ keep: ["a"], remove: [], add: [] });
  });
  it("starts on the first of its days", () => {
    // Wednesday 18 November 2026.
    expect(firstAndRepeat(undefined, today)).toEqual({
      date: today,
      repeat: "daily",
    });
    expect(firstAndRepeat([7], today)).toEqual({
      date: "2026-11-22",
      repeat: "days:0",
    });
    expect(firstAndRepeat([1, 2, 3, 4, 5, 6], today)).toEqual({
      date: today,
      repeat: "days:1,2,3,4,5,6",
    });
  });
});

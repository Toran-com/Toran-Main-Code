import { describe, expect, it } from "vitest";
import { findMandirs, MOST_MANDIRS } from "@/lib/join";

const mandirs = [
  { name: "Shree Krishna Temple", town: "Leicester", region: "East Midlands" },
  {
    name: "Leicester Hindu Temple",
    town: "Leicester",
    region: "East Midlands",
  },
  { name: "Shri Ram Mandir", town: "Southall", region: "London" },
  { name: "BAPS Shri Swaminarayan Mandir", town: "Neasden", region: "London" },
];

describe("findMandirs", () => {
  it("finds a mandir by name, town or region, names first", () => {
    expect(findMandirs(mandirs, "leicester").found.map((m) => m.name)).toEqual([
      "Leicester Hindu Temple",
      "Shree Krishna Temple",
    ]);
    expect(findMandirs(mandirs, "baps").found).toHaveLength(1);
    expect(findMandirs(mandirs, "london").found).toHaveLength(2);
    // Each word typed must match: name and town together.
    expect(
      findMandirs(mandirs, "krishna leic").found.map((m) => m.town),
    ).toEqual(["Leicester"]);
  });

  it("finds nothing for nothing typed, or nothing that matches", () => {
    expect(findMandirs(mandirs, "  ")).toEqual({ found: [], more: false });
    expect(findMandirs(mandirs, "Glasgow").found).toEqual([]);
  });

  it("shows a dozen at most and says there are more", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `Hindu Temple ${i}`,
      town: "Bradford",
      region: "Yorkshire",
    }));
    const result = findMandirs(many, "bradford");
    expect(result.found).toHaveLength(MOST_MANDIRS);
    expect(result.more).toBe(true);
  });
});

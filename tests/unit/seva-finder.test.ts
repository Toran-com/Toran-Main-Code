import { describe, expect, it } from "vitest";
import {
  findSeva,
  type FinderNeed,
  type FinderShift,
  nearEnough,
  partOfDay,
  placesBy,
  roleKind,
} from "@/lib/seva-finder";

describe("roleKind", () => {
  it.each([
    ["Kitchen", "kitchen"],
    ["Cooking and serving", "kitchen"],
    ["Tea stall", "kitchen"],
    ["Car park", "parking"],
    ["Parking", "parking"],
    ["Shoe rack", "shoes"],
    ["Shoes", "shoes"],
    ["Decorations", "decorations"],
    ["Rangoli and flowers", "decorations"],
    ["Prasad serving", "prasad"],
    ["Children's corner", "children"],
    ["Kids' crafts", "children"],
    ["Clean-up", "cleaning"],
    ["Clear up after", "cleaning"],
    ["Stewards", "welcome"],
    ["Welcome desk", "welcome"],
    ["Sound system", "other"],
    ["Teamwork", "other"],
  ])("%s is %s", (name, kind) => {
    expect(roleKind(name)).toBe(kind);
  });
});

describe("partOfDay", () => {
  it("goes by the time in the UK", () => {
    // 11:30 UTC is 11:30 in winter and 12:30 in summer.
    expect(partOfDay("2026-11-08T11:30:00Z")).toBe("morning");
    expect(partOfDay("2026-07-08T11:30:00Z")).toBe("afternoon");
    expect(partOfDay("2026-11-08T16:59:00Z")).toBe("afternoon");
    expect(partOfDay("2026-11-08T17:00:00Z")).toBe("evening");
    expect(partOfDay("2026-11-08T23:00:00Z")).toBe("evening");
  });
});

const shift = (
  id: string,
  role: string,
  day: string,
  part: FinderShift["part"],
  free: number,
): FinderShift => ({
  id,
  role,
  kind: roleKind(role),
  needsDbs: false,
  startsAt: `${day}T${part === "morning" ? "10" : part === "afternoon" ? "14" : "18"}:00:00Z`,
  endsAt: `${day}T21:00:00Z`,
  needed: free + 1,
  free,
  label: "",
  time: "",
  day,
  part,
});

const need = (
  id: string,
  at: [number, number] | null,
  shifts: FinderShift[],
): FinderNeed => ({
  id,
  title: id,
  titleGu: null,
  slug: id,
  mandir: id,
  town: "Town",
  place: id,
  latitude: at?.[0] ?? null,
  longitude: at?.[1] ?? null,
  path: `/mandirs/${id}/events/${id}/seva`,
  tile: { month: "NOV", day: "8", weekday: "Sun" },
  dateLabel: "Sun 8 Nov",
  shifts,
});

const leicester = need(
  "leicester",
  [52.636, -1.133],
  [
    shift("l1", "Kitchen", "2026-11-08", "evening", 3),
    shift("l2", "Parking", "2026-11-09", "morning", 2),
  ],
);
const harrow = need(
  "harrow",
  [51.58, -0.34],
  [shift("h1", "Kitchen", "2026-11-08", "afternoon", 5)],
);
const nowhere = need("nowhere", null, [
  shift("n1", "Shoes", "2026-11-07", "morning", 1),
]);
const all = [leicester, harrow, nowhere];
const anything = { kind: "", day: "", part: "" } as const;

describe("nearEnough", () => {
  it("keeps everything when no place is given", () => {
    expect(nearEnough(all, null, null).map((n) => n.miles)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("keeps mandirs on the map within the distance, with how far", () => {
    const near = nearEnough(all, { latitude: 52.64, longitude: -1.13 }, 15);
    expect(near.map((n) => n.need.id)).toEqual(["leicester"]);
    expect(near[0].miles).toBeLessThan(1);
    expect(
      nearEnough(all, { latitude: 52.64, longitude: -1.13 }, 100).map(
        (n) => n.need.id,
      ),
    ).toEqual(["leicester", "harrow"]);
  });
});

describe("findSeva", () => {
  it("narrows to the shifts that match, soonest first", () => {
    const found = findSeva(nearEnough(all, null, null), anything);
    expect(found.map((f) => f.need.id)).toEqual([
      "nowhere",
      "harrow",
      "leicester",
    ]);
    const kitchen = findSeva(nearEnough(all, null, null), {
      ...anything,
      kind: "kitchen",
    });
    expect(kitchen.map((f) => f.need.id)).toEqual(["harrow", "leicester"]);
    expect(kitchen[1].shifts.map((s) => s.id)).toEqual(["l1"]);
    expect(
      findSeva(nearEnough(all, null, null), {
        kind: "parking",
        day: "2026-11-09",
        part: "morning",
      }).map((f) => f.shifts.map((s) => s.id)),
    ).toEqual([["l2"]]);
    expect(
      findSeva(nearEnough(all, null, null), {
        ...anything,
        part: "evening",
        kind: "parking",
      }),
    ).toEqual([]);
  });

  it("puts the nearest first on the same day", () => {
    const found = findSeva(
      nearEnough(all, { latitude: 51.6, longitude: -0.3 }, 200),
      { ...anything, day: "2026-11-08" },
    );
    expect(found.map((f) => f.need.id)).toEqual(["harrow", "leicester"]);
  });
});

describe("placesBy", () => {
  it("counts places for each option, given the other choices", () => {
    const near = nearEnough(all, null, null);
    expect(
      Object.fromEntries(placesBy(near, anything, "kind", (s) => s.kind)),
    ).toEqual({ kitchen: 8, parking: 2, shoes: 1 });
    // Choosing a kind changes the day counts, but not the kind counts.
    const kitchen = { ...anything, kind: "kitchen" } as const;
    expect(
      Object.fromEntries(placesBy(near, kitchen, "day", (s) => s.day)),
    ).toEqual({ "2026-11-08": 8 });
    expect(
      Object.fromEntries(placesBy(near, kitchen, "kind", (s) => s.kind)),
    ).toEqual({ kitchen: 8, parking: 2, shoes: 1 });
  });
});

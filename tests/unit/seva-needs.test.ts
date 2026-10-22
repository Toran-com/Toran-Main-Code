import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

import { type SevaRow, sevaNeeds, sevaTotals } from "@/lib/seva-needs";

const mandir = {
  slug: "m",
  name: "Mandir",
  town: "Leicester",
  region: "East Midlands",
  latitude: 52.6,
  longitude: -1.1,
};
const shift = (
  id: string,
  starts: string,
  ends: string,
  needed: number,
  offline = 0,
  online = 0,
) => ({
  id,
  starts_at: starts,
  ends_at: ends,
  needed,
  filled_offline: offline,
  taken_online: online,
});
const row = (id: string, roles: SevaRow["seva_roles"]): SevaRow => ({
  id,
  title: id,
  title_gu: null,
  mandir,
  seva_roles: roles,
});

const now = new Date("2026-11-07T12:00:00Z");

describe("sevaNeeds", () => {
  it("keeps shifts that haven't ended and still need people, soonest first", () => {
    const needs = sevaNeeds(
      [
        row("diwali", [
          {
            name: "Kitchen",
            needs_dbs: false,
            seva_shifts: [
              shift(
                "k2",
                "2026-11-08T18:00:00Z",
                "2026-11-08T21:00:00Z",
                6,
                2,
                1,
              ),
              shift("k1", "2026-11-08T15:00:00Z", "2026-11-08T18:00:00Z", 4, 4),
              shift("k0", "2026-11-06T15:00:00Z", "2026-11-06T18:00:00Z", 4),
            ],
          },
          {
            name: "Children's corner",
            needs_dbs: true,
            seva_shifts: [
              shift("c1", "2026-11-08T17:00:00Z", "2026-11-08T20:00:00Z", 2),
            ],
          },
        ]),
        row("annakut", [
          {
            name: "Parking",
            needs_dbs: false,
            seva_shifts: [
              shift("p1", "2026-11-07T09:00:00Z", "2026-11-07T13:00:00Z", 3),
            ],
          },
        ]),
        row("full", [
          {
            name: "Shoes",
            needs_dbs: false,
            seva_shifts: [
              shift(
                "s1",
                "2026-11-09T09:00:00Z",
                "2026-11-09T13:00:00Z",
                2,
                1,
                1,
              ),
            ],
          },
        ]),
      ],
      now,
    );
    expect(needs.map((n) => n.event.id)).toEqual(["annakut", "diwali"]);
    const diwali = needs[1];
    expect(diwali.shifts.map((s) => [s.id, s.free])).toEqual([
      ["c1", 2],
      ["k2", 3],
    ]);
    expect(diwali.next_starts_at).toBe("2026-11-08T17:00:00Z");
    expect(diwali.free).toBe(5);
    expect(diwali.freeOnline).toBe(3);
  });

  it("never counts more places taken than needed", () => {
    const [need] = sevaNeeds(
      [
        row("e", [
          {
            name: "Kitchen",
            needs_dbs: false,
            seva_shifts: [
              shift("a", "2026-11-08T15:00:00Z", "2026-11-08T18:00:00Z", 3, 5),
              shift("b", "2026-11-08T18:00:00Z", "2026-11-08T21:00:00Z", 3, 1),
            ],
          },
        ]),
      ],
      now,
    );
    expect(need.free).toBe(2);
  });
});

describe("sevaTotals", () => {
  it("counts places still needed, mandirs asking, and slots taken on Toran", () => {
    const other = { ...mandir, slug: "n" };
    const totals = sevaTotals(
      [
        row("a", [
          {
            name: "Kitchen",
            needs_dbs: false,
            seva_shifts: [
              shift(
                "k1",
                "2026-11-08T15:00:00Z",
                "2026-11-08T18:00:00Z",
                4,
                1,
                1,
              ),
              // Full: no places, but its slot taken on Toran counts.
              shift(
                "k2",
                "2026-11-08T18:00:00Z",
                "2026-11-08T21:00:00Z",
                2,
                1,
                1,
              ),
              // Over: nothing counts.
              shift(
                "k0",
                "2026-11-06T15:00:00Z",
                "2026-11-06T18:00:00Z",
                4,
                0,
                3,
              ),
            ],
          },
        ]),
        row("b", [
          {
            name: "Parking",
            needs_dbs: false,
            seva_shifts: [
              shift("p1", "2026-11-09T09:00:00Z", "2026-11-09T13:00:00Z", 3),
            ],
          },
        ]),
        { ...row("c", []), mandir: other },
      ],
      now,
    );
    expect(totals).toEqual({ places: 5, mandirs: 1, taken: 2 });
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

import { rolesSummary, type SevaRow, sevaNeeds } from "@/lib/seva-needs";

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

describe("rolesSummary", () => {
  it("adds up places free per role, in the order roles first come up", () => {
    const [need] = sevaNeeds(
      [
        row("e", [
          {
            name: "Parking",
            needs_dbs: false,
            seva_shifts: [
              shift("p", "2026-11-08T18:00:00Z", "2026-11-08T21:00:00Z", 2),
            ],
          },
          {
            name: "Kitchen",
            needs_dbs: false,
            seva_shifts: [
              shift("k1", "2026-11-08T15:00:00Z", "2026-11-08T18:00:00Z", 3),
              shift("k2", "2026-11-08T19:00:00Z", "2026-11-08T22:00:00Z", 4, 1),
            ],
          },
        ]),
      ],
      now,
    );
    expect(rolesSummary(need.shifts)).toEqual([
      { role: "Kitchen", free: 6, needsDbs: false },
      { role: "Parking", free: 2, needsDbs: false },
    ]);
  });
});

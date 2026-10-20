import { describe, expect, it } from "vitest";
import { attentionCount, daysSince, readAttention } from "@/lib/attention";

const MANDIR = { slug: "busy-mandir", name: "Busy Mandir", town: "Harrow" };

describe("readAttention", () => {
  it("reads each list the database gives", () => {
    const attention = readAttention({
      unconfirmed: {
        total: 3,
        items: [
          {
            ...MANDIR,
            id: "e1",
            title: "Diwali",
            next_at: "2026-11-08T18:00:00+00:00",
            confirmed_at: null,
            has_committee: true,
          },
        ],
      },
      quiet: { total: 1, items: [{ ...MANDIR, last_added: null }] },
      websites: {
        total: 1,
        items: [
          {
            ...MANDIR,
            outcome: "unreachable",
            checked_at: "2026-10-18T09:00:00+00:00",
            notes: "Timed out",
          },
        ],
      },
      invites: {
        total: 1,
        items: [{ ...MANDIR, expires_at: "2026-10-20T09:00:00+00:00" }],
      },
      festival_dates: {
        total: 1,
        items: [{ name: "Diwali", calendar: null, starts_on: "2026-11-08" }],
      },
      posters: {
        total: 2,
        items: [
          {
            ...MANDIR,
            waiting: 2,
            oldest: "2026-10-10T09:00:00+00:00",
            has_committee: false,
          },
        ],
      },
      claims: {
        total: 1,
        items: [{ ...MANDIR, created_at: "2026-10-15T09:00:00+00:00" }],
      },
      requests: {
        total: 2,
        items: [
          {
            id: 7,
            kind: "remove_mandir",
            page: "/mandirs/busy-mandir",
            details: "Please hide our page",
            created_at: "2026-10-19T09:00:00+00:00",
          },
          { id: "not a number", kind: "wrong", page: "/", details: "x" },
        ],
      },
    });
    expect(attention.unconfirmed.total).toBe(3);
    expect(attention.unconfirmed.items[0]).toMatchObject({
      title: "Diwali",
      has_committee: true,
      confirmed_at: null,
    });
    expect(attention.quiet.items).toEqual([{ ...MANDIR, last_added: null }]);
    expect(attention.websites.items[0].notes).toBe("Timed out");
    expect(attention.festival_dates.items[0].calendar).toBeNull();
    expect(attention.posters.items[0]).toMatchObject({
      waiting: 2,
      has_committee: false,
    });
    expect(attention.requests.items).toEqual([
      {
        id: 7,
        kind: "remove_mandir",
        page: "/mandirs/busy-mandir",
        details: "Please hide our page",
        created_at: "2026-10-19T09:00:00+00:00",
      },
    ]);
    expect(attentionCount(attention)).toBe(12);
  });

  it("copes with nothing, or something malformed", () => {
    const empty = readAttention(null);
    expect(empty.unconfirmed).toEqual({ total: 0, items: [] });
    expect(attentionCount(empty)).toBe(0);

    const odd = readAttention({
      unconfirmed: { total: "lots", items: [{ title: "No id" }, null, 4] },
      quiet: { items: [{ ...MANDIR }, { slug: "no-name" }] },
      posters: { total: 1, items: [{ ...MANDIR, oldest: "x", waiting: "2" }] },
      invites: "nope",
    });
    expect(odd.unconfirmed).toEqual({ total: 0, items: [] });
    // The total is never fewer than the items given.
    expect(odd.quiet).toEqual({
      total: 1,
      items: [{ ...MANDIR, last_added: null }],
    });
    expect(odd.posters.items).toEqual([]);
    expect(odd.invites).toEqual({ total: 0, items: [] });
  });
});

describe("daysSince", () => {
  it("counts whole days, never below zero", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    expect(daysSince("2026-10-15T13:00:00Z", now)).toBe(3);
    expect(daysSince("2026-10-19T11:00:00Z", now)).toBe(0);
    expect(daysSince("2026-10-25T00:00:00Z", now)).toBe(0);
  });
});

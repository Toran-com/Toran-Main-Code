import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetPlanned,
  mergeVisits,
  notePlanned,
  parseVisits,
  pastVisits,
  setWent,
  visitsSnapshot,
} from "@/lib/event-history";
import { byDay, comingUp, decodeMove, encodeMove, yearTotals } from "@/lib/hub";
import {
  doneSnapshot,
  keepEnded,
  parseDone,
  shiftHours,
  shiftMandir,
} from "@/lib/seva-history";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const c = "33333333-3333-4333-8333-333333333333";

function shift(slot: string, starts: string, ends: string) {
  return {
    slot,
    role: "Kitchen",
    label: "Sat 31 Oct, 6pm–9pm",
    title: "Diwali",
    place: "Shree Example Mandir, Leicester",
    path: "/mandirs/shree-example-mandir-leicester/events/x/seva",
    starts_at: starts,
    ends_at: ends,
  };
}

// The browser's storage, for the functions that save.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { dispatchEvent: () => true });
});
afterEach(() => vi.unstubAllGlobals());

describe("past events on this phone", () => {
  it("keeps real entries, one per event, newest first", () => {
    const stored = JSON.stringify([
      { id: a, at: "2026-10-01T18:00:00Z", went: true },
      { id: b, at: "2026-10-20T18:00:00Z" },
      { id: "nope", at: "2026-10-20T18:00:00Z" },
      { id: c, at: "not a date" },
      { id: a, at: "2026-10-01T18:00:00Z", went: false },
    ]);
    expect(parseVisits(stored)).toEqual([
      { id: b, at: "2026-10-20T18:00:00Z" },
      { id: a, at: "2026-10-01T18:00:00Z", went: false },
    ]);
    expect(parseVisits("")).toEqual([]);
    expect(parseVisits("{broken")).toEqual([]);
  });

  it("remembers planned events, and forgets them if unplanned before they happen", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    notePlanned([
      { id: a, at: "2026-11-08T18:00:00Z" },
      { id: b, at: "2026-10-20T18:00:00Z" },
    ]);
    forgetPlanned([a, b], now);
    // The past one stays, to ask about.
    expect(parseVisits(visitsSnapshot())).toEqual([
      { id: b, at: "2026-10-20T18:00:00Z" },
    ]);
  });

  it("keeps an answer when the event is planned again", () => {
    setWent(a, "2026-10-20T18:00:00Z", true);
    notePlanned([{ id: a, at: "2026-10-20T18:00:00Z" }]);
    expect(parseVisits(visitsSnapshot())[0].went).toBe(true);
  });

  it("splits past events into went and still to ask", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    const { went, ask } = pastVisits(
      [
        { id: a, at: "2026-10-01T18:00:00Z", went: true },
        { id: b, at: "2026-10-20T18:00:00Z" },
        { id: c, at: "2026-10-21T18:00:00Z", went: false },
        {
          id: "44444444-4444-4444-8444-444444444444",
          at: "2026-11-01T18:00:00Z",
        },
      ],
      now,
    );
    expect(went.map((v) => v.id)).toEqual([a]);
    expect(ask.map((v) => v.id)).toEqual([b]);
  });

  it("merges another phone's events, keeping answers given here", () => {
    setWent(a, "2026-10-01T18:00:00Z", false);
    mergeVisits([
      { id: a, at: "2026-10-01T18:00:00Z", went: true },
      { id: b, at: "2026-10-02T18:00:00Z", went: true },
    ]);
    const visits = parseVisits(visitsSnapshot());
    expect(visits.find((v) => v.id === a)?.went).toBe(false);
    expect(visits.find((v) => v.id === b)?.went).toBe(true);
  });
});

describe("seva done on this phone", () => {
  it("copies shifts once they've ended, each once", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    const ended = shift("s1", "2026-10-20T17:00:00Z", "2026-10-20T20:00:00Z");
    const later = shift("s2", "2026-11-08T17:00:00Z", "2026-11-08T20:00:00Z");
    expect(keepEnded([ended, later], now)).toBe(true);
    expect(keepEnded([ended], now)).toBe(false);
    expect(parseDone(doneSnapshot()).map((s) => s.slot)).toEqual(["s1"]);
  });

  it("only keeps shifts that point at a page on Toran", () => {
    const odd = {
      ...shift("s3", "2026-10-20T17:00:00Z", "2026-10-20T20:00:00Z"),
      path: "https://elsewhere.example/x",
    };
    expect(parseDone(JSON.stringify([odd]))).toEqual([]);
  });

  it("works out hours and the mandir", () => {
    const s = shift("s1", "2026-10-20T17:00:00Z", "2026-10-20T19:40:00Z");
    expect(shiftHours(s)).toBe(2.5);
    expect(shiftHours({ starts_at: s.ends_at, ends_at: s.starts_at })).toBe(0);
    expect(shiftMandir(s)).toBe("shree-example-mandir-leicester");
  });
});

describe("My Toran", () => {
  const now = new Date("2026-10-27T12:00:00Z");

  it("lists what's coming up, soonest first, without finished shifts", () => {
    const slots = [
      {
        ...shift("s1", "2026-10-28T17:00:00Z", "2026-10-28T20:00:00Z"),
        shift: "x",
        event: "e",
      },
      {
        ...shift("s2", "2026-10-20T17:00:00Z", "2026-10-20T20:00:00Z"),
        shift: "y",
        event: "e",
      },
    ];
    const items = comingUp(
      [
        { id: a, at: "2026-11-08T18:00:00Z" },
        { id: b, at: "2026-10-27T18:00:00Z" },
      ],
      slots,
      now,
    );
    expect(items.map((i) => (i.kind === "seva" ? i.slot.slot : i.id))).toEqual([
      b,
      "s1",
      a,
    ]);
  });

  it("groups by UK day", () => {
    const days = byDay([
      { at: "2026-10-27T18:00:00Z" },
      { at: "2026-10-27T23:30:00Z" },
      { at: "2026-10-28T09:00:00Z" },
    ]);
    expect(days.map((d) => [d.day, d.items.length])).toEqual([
      ["2026-10-27", 2],
      ["2026-10-28", 1],
    ]);
  });

  it("adds up the year", () => {
    const totals = yearTotals({
      year: "2026",
      went: [
        { id: a, at: "2026-10-01T18:00:00Z", went: true },
        { id: b, at: "2025-10-01T18:00:00Z", went: true },
      ],
      done: [
        shift("s1", "2026-10-20T17:00:00Z", "2026-10-20T20:00:00Z"),
        shift("s2", "2026-03-20T17:00:00Z", "2026-03-20T18:30:00Z"),
      ],
      mandirOf: (id) => (id === a ? "another-mandir" : undefined),
    });
    expect(totals).toEqual({ events: 1, shifts: 2, hours: 4.5, mandirs: 2 });
  });

  it("moves everything to another phone and back, safely", () => {
    const data = {
      following: ["shree-example-mandir-leicester"],
      plan: [{ id: a, at: "2026-11-08T18:00:00Z" }],
      visits: [{ id: b, at: "2026-10-01T18:00:00Z", went: true }],
      done: [shift("s1", "2026-10-20T17:00:00Z", "2026-10-20T20:00:00Z")],
      slots: [
        {
          ...shift("s2", "2026-11-08T17:00:00Z", "2026-11-08T20:00:00Z"),
          shift: "x",
          event: "e",
        },
      ],
    };
    expect(decodeMove(encodeMove(data))).toEqual(data);
    // Gujarati travels too.
    const gu = { ...data, done: [{ ...data.done[0], role: "રસોડું" }] };
    expect(decodeMove(encodeMove(gu))?.done[0].role).toBe("રસોડું");
    expect(decodeMove("not-a-real-link")).toBeNull();
    expect(
      decodeMove(
        encodeMove({
          following: [],
          plan: [],
          visits: [],
          done: [],
          slots: [],
        }),
      ),
    ).toBeNull();
  });
});

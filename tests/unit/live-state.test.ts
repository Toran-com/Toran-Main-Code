import { describe, expect, it } from "vitest";
import {
  endOf,
  liveState,
  occurrences,
  type LiveEvent,
} from "@/lib/live-state";

const mandir = {
  slug: "shree-mandir",
  name: "Shree Mandir",
  town: "Harrow",
  live_url: null,
};

function event(over: Partial<LiveEvent>): LiveEvent {
  return {
    id: "e1",
    title: "Satsang",
    title_gu: null,
    kind: "satsang",
    origin: null,
    all_day: false,
    starts_at: "2026-11-24T18:00:00Z",
    ends_at: null,
    mandir,
    ...over,
  };
}

const at = (iso: string) => Date.parse(iso);

describe("endOf", () => {
  it("uses the event's own end time", () => {
    expect(endOf(event({ ends_at: "2026-11-24T21:30:00Z" }))).toBe(
      at("2026-11-24T21:30:00Z"),
    );
  });

  it("takes two hours for an event without one, 45 minutes for an aarti", () => {
    expect(endOf(event({}))).toBe(at("2026-11-24T20:00:00Z"));
    expect(endOf(event({ origin: "aarti" }))).toBe(at("2026-11-24T18:45:00Z"));
  });

  it("ends an all-day event at midnight in the UK, in winter and summer", () => {
    expect(
      endOf(event({ all_day: true, starts_at: "2026-11-24T00:00:00Z" })),
    ).toBe(at("2026-11-25T00:00:00Z"));
    // 15 June: midnight in London is 23:00 UTC.
    expect(
      endOf(event({ all_day: true, starts_at: "2026-06-15T09:00:00Z" })),
    ).toBe(at("2026-06-15T23:00:00Z"));
  });
});

describe("liveState", () => {
  const events = [
    event({ id: "aarti", origin: "aarti", starts_at: "2026-11-24T18:30:00Z" }),
    event({ id: "satsang", starts_at: "2026-11-24T18:00:00Z" }),
    event({ id: "garba", starts_at: "2026-11-24T20:00:00Z" }),
    event({ id: "over", starts_at: "2026-11-24T10:00:00Z" }),
    event({ id: "tomorrow", starts_at: "2026-11-25T10:00:00Z" }),
    event({
      id: "fair",
      all_day: true,
      starts_at: "2026-11-24T00:00:00Z",
    }),
  ];

  it("puts what's on now first, then what's later today", () => {
    const state = liveState(events, at("2026-11-24T18:40:00Z"));
    expect(state.now.map((e) => e.id).sort()).toEqual([
      "aarti",
      "fair",
      "satsang",
    ]);
    expect(state.later.map((e) => e.id)).toEqual(["garba"]);
  });

  it("lets an aarti finish, and an event end at its end time", () => {
    const state = liveState(events, at("2026-11-24T19:20:00Z"));
    expect(state.now.map((e) => e.id).sort()).toEqual(["fair", "satsang"]);
  });

  it("keeps an all-day event on until midnight, with nothing later", () => {
    const state = liveState(events, at("2026-11-24T23:30:00Z"));
    expect(state.now.map((e) => e.id)).toEqual(["fair"]);
    expect(state.later).toEqual([]);
  });
});

describe("occurrences", () => {
  const row = {
    id: "daily",
    title: "Aarti",
    title_gu: null,
    kind: "aarti",
    origin: "aarti",
    all_day: false,
    starts_at: "2026-01-01T18:00:00Z",
    ends_at: null,
    mandir,
  };

  it("gives each date of a repeating event, leaving out cancelled ones", () => {
    const list = occurrences(
      [
        {
          ...row,
          recurrence: "daily",
          event_occurrences: [
            {
              starts_at: "2026-11-25T18:00:00Z",
              ends_at: null,
              cancelled: false,
            },
            {
              starts_at: "2026-11-24T18:00:00Z",
              ends_at: null,
              cancelled: false,
            },
            {
              starts_at: "2026-11-26T18:00:00Z",
              ends_at: null,
              cancelled: true,
            },
          ],
        },
      ],
      "2026-11-23T00:00:00Z",
      "2026-11-27T00:00:00Z",
    );
    expect(list.map((e) => e.starts_at)).toEqual([
      "2026-11-24T18:00:00Z",
      "2026-11-25T18:00:00Z",
    ]);
  });

  it("gives a one-off event once, if it's in the window", () => {
    const one = { ...row, recurrence: null, event_occurrences: null };
    expect(
      occurrences([one], "2025-12-31T00:00:00Z", "2026-01-02T00:00:00Z"),
    ).toHaveLength(1);
    expect(
      occurrences([one], "2026-11-23T00:00:00Z", "2026-11-27T00:00:00Z"),
    ).toHaveLength(0);
  });
});

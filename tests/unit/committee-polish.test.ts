import { describe, expect, it } from "vitest";
import { recentChanges, type ChangedEvent } from "@/lib/committee-changes";
import { weekEvents, weekMessage } from "@/lib/committee-week";

// Tuesday 27 October 2026, mid-morning in London.
const now = new Date("2026-10-27T10:00:00Z");

describe("this week's message", () => {
  const event = (title: string, at: string, status = "published") => ({
    title,
    next_starts_at: at,
    all_day: false,
    status,
  });

  it("lists the next seven days, in order, with a link to the rest", () => {
    const week = weekEvents(
      [
        event("Annakut", "2026-11-02T11:00:00Z"),
        event("Aarti", "2026-10-27T18:00:00Z"),
        event("Next week's katha", "2026-11-03T19:00:00Z"),
        event("Called off", "2026-10-29T19:00:00Z", "cancelled"),
      ],
      now,
    );
    expect(week.map((e) => e.title)).toEqual(["Aarti", "Annakut"]);
    expect(
      weekMessage(
        { name: "Shree Example Mandir" },
        week,
        "https://toran.example/mandirs/x",
      ),
    ).toBe(
      [
        "This week at Shree Example Mandir:",
        "• Tue 27 Oct, 6pm: Aarti\n• Mon 2 Nov, 11am: Annakut",
        "Everything coming up: https://toran.example/mandirs/x",
      ].join("\n\n"),
    );
  });
});

describe("what's changed", () => {
  const base: ChangedEvent = {
    id: "e",
    title: "Diwali",
    status: "published",
    origin: "mandir",
    created_at: "2026-10-25T09:00:00Z",
    created_by: "me",
    updated_at: "2026-10-25T09:00:10Z",
  };
  const committee = new Set(["me", "colleague"]);

  it("says what happened and who added it", () => {
    const changes = recentChanges(
      [
        { ...base, id: "1" },
        { ...base, id: "2", created_by: "colleague" },
        { ...base, id: "3", created_by: "someone-at-toran" },
        { ...base, id: "4", origin: "website", created_by: "someone-at-toran" },
        { ...base, id: "5", updated_at: "2026-10-26T12:00:00Z" },
        {
          ...base,
          id: "6",
          status: "cancelled",
          updated_at: "2026-10-26T13:00:00Z",
        },
      ],
      "me",
      committee,
      now,
    );
    expect(changes.map((c) => [c.id, c.what, c.by])).toEqual([
      ["6", "Cancelled", null],
      ["5", "Changed", null],
      ["1", "Added", "by you"],
      ["2", "Added", "by your committee"],
      ["3", "Added", "by Toran"],
      ["4", "Added", "from your website"],
    ]);
  });

  it("leaves out old changes and saves that didn't finish", () => {
    expect(
      recentChanges(
        [
          {
            ...base,
            created_at: "2026-09-01T09:00:00Z",
            updated_at: "2026-09-01T09:00:00Z",
          },
          { ...base, status: "removed" },
          // Added long ago, changed this week: shown as changed.
          {
            ...base,
            id: "old",
            created_at: "2026-09-01T09:00:00Z",
            updated_at: "2026-10-26T09:00:00Z",
          },
        ],
        "me",
        committee,
        now,
      ).map((c) => [c.id, c.what]),
    ).toEqual([["old", "Changed"]]);
  });
});

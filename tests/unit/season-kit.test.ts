import { describe, expect, it, vi } from "vitest";

// The kit's data comes from the cached directory; only the message is
// worked out here.
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

import { kitMessage, type SeasonKit } from "@/lib/season-kit";
import { DIWALI } from "@/lib/seasons";

const event = (title: string, next: string, allDay = false) =>
  ({
    id: title,
    title,
    next_starts_at: next,
    all_day: allDay,
  }) as SeasonKit["events"][number];

describe("kitMessage", () => {
  it("lists each event on its own line, then where to find the details", () => {
    const kit = {
      season: DIWALI,
      days: [],
      mandir: { name: "Shree Ram Mandir", town: "Leicester" },
      events: [
        event("Dhanteras Lakshmi puja", "2026-11-06T18:30:00Z"),
        event("Annakut darshan", "2026-11-10T00:00:00Z", true),
      ],
    } as unknown as SeasonKit;
    expect(kitMessage(kit, "https://toran.example/mandirs/shree-ram")).toBe(
      [
        "Diwali week at Shree Ram Mandir, Leicester",
        "",
        "• Fri 6 Nov, 6:30pm: Dhanteras Lakshmi puja",
        "• Tue 10 Nov: Annakut darshan",
        "",
        "Details, and add them to your calendar: https://toran.example/mandirs/shree-ram",
      ].join("\n"),
    );
  });
});

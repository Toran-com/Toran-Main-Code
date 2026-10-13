import { describe, expect, it } from "vitest";
import { withNextStart } from "@/lib/events";

describe("withNextStart", () => {
  const from = "2026-10-13T00:00:00Z";
  it("orders one-off and repeating events by their next date", () => {
    const rows = [
      { id: "diwali", starts_at: "2026-11-08T18:00:00Z", recurrence: null },
      { id: "past", starts_at: "2026-10-01T18:00:00Z", recurrence: null },
      {
        id: "aarti",
        starts_at: "2026-10-03T18:00:00Z",
        recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261231",
        event_occurrences: [
          { starts_at: "2026-10-17T18:00:00Z", cancelled: true },
          { starts_at: "2026-10-24T18:00:00Z", cancelled: false },
          { starts_at: "2026-10-10T18:00:00Z", cancelled: false },
        ],
      },
      {
        id: "ended",
        starts_at: "2026-09-05T18:00:00Z",
        recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261003",
        event_occurrences: [],
      },
    ];
    const result = withNextStart(rows, from);
    expect(result.map((r) => r.id)).toEqual(["aarti", "diwali"]);
    expect(result[0].next_starts_at).toBe("2026-10-24T18:00:00Z");
  });
});

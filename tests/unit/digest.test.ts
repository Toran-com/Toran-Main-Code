import { describe, expect, it } from "vitest";
import { buildDigest, digestText } from "@/lib/digest";
import type { ListedEvent } from "@/lib/whats-on";

// Tuesday 13 October 2026.
const now = new Date("2026-10-13T11:00:00Z");

function event(
  title: string,
  at: string,
  extra: Partial<ListedEvent> = {},
): ListedEvent {
  return {
    id: title,
    title,
    title_gu: null,
    summary: null,
    all_day: false,
    status: "published",
    recurrence: null,
    link: null,
    next_starts_at: at,
    mandir: {
      slug: "geeta-bhavan-leicester",
      name: "Geeta Bhavan Leicester",
      town: "Leicester",
      region: "East Midlands",
      latitude: null,
      longitude: null,
    },
    ...extra,
  };
}

const events = [
  event("Garba night", "2026-10-14T18:00:00Z"),
  event("Aarti", "2026-10-19T17:00:00Z"),
  event("Too late", "2026-10-20T17:00:00Z"),
  event("Called off", "2026-10-15T17:00:00Z", { status: "cancelled" }),
  event("Wembley havan", "2026-10-17T09:00:00Z", {
    mandir: {
      slug: "x",
      name: "Shri Mandir",
      town: "Wembley",
      region: "London",
      latitude: null,
      longitude: null,
    },
  }),
];

const festival = (
  slug: string,
  starts_on: string,
  ends_on: string,
  verified = false,
  calendar: "gujarati" | null = null,
) => ({
  id: `${slug}-${calendar}`,
  calendar,
  starts_on,
  ends_on,
  verified,
  source: null,
  festival: {
    slug,
    name: slug[0].toUpperCase() + slug.slice(1),
    summary: null,
  },
});

const dates = [
  festival("navratri", "2026-10-11", "2026-10-19"),
  festival("dussehra", "2026-10-20", "2026-10-20", true),
  festival("dussehra", "2026-10-21", "2026-10-21", false, "gujarati"),
  festival("diwali", "2026-11-08", "2026-11-08"),
];

describe("buildDigest", () => {
  it("takes the next seven days, leaving out cancelled events", () => {
    const digest = buildDigest(events, dates, now, null);
    expect(digest.start).toBe("2026-10-13");
    expect(digest.end).toBe("2026-10-19");
    expect(digest.count).toBe(3);
    expect(digest.days.map((d) => d.heading)).toEqual([
      "Wednesday 14 October",
      "Saturday 17 October",
      "Monday 19 October",
    ]);
  });

  it("can be for one region", () => {
    const digest = buildDigest(events, dates, now, "London");
    expect(digest.days.flatMap((d) => d.events.map((e) => e.title))).toEqual([
      "Wembley havan",
    ]);
  });

  it("lists festivals in the next fortnight, once each", () => {
    expect(buildDigest(events, dates, now, null).festivals).toEqual([
      {
        name: "Navratri",
        slug: "navratri",
        when: "Sun 11 Oct – Mon 19 Oct 2026",
        checked: false,
      },
      {
        name: "Dussehra",
        slug: "dussehra",
        when: "Tue 20 Oct 2026",
        checked: true,
      },
    ]);
  });
});

describe("digestText", () => {
  it("reads well as plain text", () => {
    const text = digestText(
      buildDigest(events, dates, now, null),
      "https://example.org",
    );
    expect(text).toContain(
      "What's on at mandirs: Tue 13 Oct – Mon 19 Oct 2026",
    );
    expect(text).toContain(
      "• Navratri: Sun 11 Oct – Mon 19 Oct 2026 (date not yet checked)",
    );
    expect(text).toContain("• Dussehra: Tue 20 Oct 2026\n");
    expect(text).toContain(
      "Wednesday 14 October\n• 7pm Garba night, Geeta Bhavan Leicester (Leicester)",
    );
    expect(text).not.toContain("Called off");
    expect(text.endsWith("https://example.org/whats-on")).toBe(true);
  });

  it("says so when nothing is on", () => {
    expect(
      digestText(buildDigest([], [], now, "Wales"), "https://x.org"),
    ).toContain("(Wales)\n\nNo events listed this week yet.");
  });
});

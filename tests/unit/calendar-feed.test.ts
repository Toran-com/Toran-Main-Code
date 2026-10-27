import { describe, expect, it } from "vitest";
import { feedAddress, feedLabel } from "@/lib/calendar-feed";
import { publicLink } from "@/lib/website-claims";

const GROUP = "abc123@group.calendar.google.com";
const PUBLIC_FEED = `https://calendar.google.com/calendar/ical/${encodeURIComponent(GROUP)}/public/basic.ics`;

describe("a mandir's calendar address", () => {
  it("takes the iCal address as given", () => {
    expect(feedAddress(PUBLIC_FEED)).toEqual({ ok: true, url: PUBLIC_FEED });
    expect(feedAddress(" https://example.org/events.ics ")).toEqual({
      ok: true,
      url: "https://example.org/events.ics",
    });
  });

  it("turns webcal links and plain addresses into https", () => {
    expect(feedAddress("webcal://example.org/events.ics")).toEqual({
      ok: true,
      url: "https://example.org/events.ics",
    });
    expect(feedAddress("example.org/feed/ical")).toEqual({
      ok: true,
      url: "https://example.org/feed/ical",
    });
  });

  it("finds the feed behind a Google Calendar page or embed", () => {
    expect(
      feedAddress(
        `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GROUP)}&ctz=Europe%2FLondon`,
      ),
    ).toEqual({ ok: true, url: PUBLIC_FEED });
    expect(
      feedAddress(
        `https://calendar.google.com/calendar/u/0?cid=${Buffer.from(GROUP).toString("base64")}`,
      ),
    ).toEqual({ ok: true, url: PUBLIC_FEED });
    expect(feedAddress("https://calendar.google.com/calendar/r")).toEqual({
      ok: false,
      error: "address",
    });
  });

  it("refuses what isn't an address", () => {
    expect(feedAddress("")).toEqual({ ok: false, error: "empty" });
    expect(feedAddress("not an address at all")).toEqual({
      ok: false,
      error: "address",
    });
    expect(feedAddress("https://user:pw@example.org/e.ics")).toEqual({
      ok: false,
      error: "address",
    });
    expect(feedAddress(`https://example.org/${"x".repeat(600)}.ics`)).toEqual({
      ok: false,
      error: "address",
    });
  });

  it("is shown back without its private part", () => {
    expect(feedLabel(PUBLIC_FEED)).toBe("Google Calendar");
    expect(
      feedLabel(
        `https://calendar.google.com/calendar/ical/${GROUP}/private-9f8e7d/basic.ics`,
      ),
    ).toBe("Google Calendar (secret address)");
    expect(
      feedLabel("https://outlook.office365.com/owa/calendar/x/y/calendar.ics"),
    ).toBe("Outlook calendar");
    expect(feedLabel("https://www.shreeram.org.uk/events.ics")).toBe(
      "shreeram.org.uk",
    );
  });
});

describe("links on events read from a calendar", () => {
  const feed =
    "https://calendar.google.com/calendar/ical/x/private-abc/basic.ics";
  it("keeps an event's own page, on the mandir's site too", () => {
    expect(publicLink("https://shreeram.org.uk/diwali", feed)).toBe(
      "https://shreeram.org.uk/diwali",
    );
    expect(
      publicLink(
        "https://shreeram.org.uk/diwali",
        "https://shreeram.org.uk/events.ics",
      ),
    ).toBe("https://shreeram.org.uk/diwali");
  });
  it("drops the calendar's own address and other calendar links", () => {
    expect(publicLink(feed, feed)).toBeNull();
    expect(
      publicLink("https://calendar.google.com/calendar/event?eid=1", feed),
    ).toBeNull();
    expect(
      publicLink("https://example.org/events.ics", "https://example.org/x"),
    ).toBeNull();
    expect(publicLink("javascript:alert(1)", feed)).toBeNull();
    expect(publicLink("", feed)).toBeNull();
  });
});

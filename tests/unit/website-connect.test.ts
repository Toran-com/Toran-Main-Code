import { describe, expect, it } from "vitest";
import { isCalendarAddress, websiteAddress } from "@/lib/website-connect";

describe("websiteAddress", () => {
  it("takes the address as people type it", () => {
    expect(websiteAddress("www.shreeram.org.uk")).toBe(
      "https://www.shreeram.org.uk/",
    );
    expect(websiteAddress(" https://shreeram.org.uk/events ")).toBe(
      "https://shreeram.org.uk/events",
    );
    expect(websiteAddress("http://shreeram.org.uk")).toBe(
      "http://shreeram.org.uk/",
    );
  });

  it("turns away what isn't a website", () => {
    expect(websiteAddress("")).toBe(null);
    expect(websiteAddress("shree ram mandir")).toBe(null);
    expect(websiteAddress("localhost")).toBe(null);
    expect(websiteAddress("https://user:pass@shreeram.org.uk")).toBe(null);
    expect(websiteAddress(`https://${"a".repeat(500)}.org`)).toBe(null);
  });
});

describe("isCalendarAddress", () => {
  it("spots a calendar's address", () => {
    expect(
      isCalendarAddress(
        "https://calendar.google.com/calendar/ical/abc/public/basic.ics",
      ),
    ).toBe(true);
    expect(isCalendarAddress("webcal://shreeram.org.uk/events.ics")).toBe(true);
    expect(isCalendarAddress("https://shreeram.org.uk/feed.ics?x=1")).toBe(
      true,
    );
    expect(
      isCalendarAddress(
        "https://outlook.office365.com/owa/calendar/abc/reachcalendar.ics",
      ),
    ).toBe(true);
  });

  it("leaves a website alone", () => {
    expect(isCalendarAddress("https://shreeram.org.uk/events")).toBe(false);
    expect(isCalendarAddress("www.shreeram.org.uk")).toBe(false);
  });
});

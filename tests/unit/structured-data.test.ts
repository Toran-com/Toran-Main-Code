import { describe, expect, it } from "vitest";
import { eventData, scriptJson } from "@/lib/structured-data";

const mandir = {
  name: "Reading Hindu Temple",
  town: "Reading",
  postcode: "RG1 7RD",
  website: "https://www.readinghindutemple.co.uk/",
};
const event = {
  title: "Diwali celebrations",
  summary: "Fireworks and prasad.",
  all_day: false,
  ends_at: "2026-11-08T21:00:00Z",
  status: "scheduled" as const,
  recurrence: null,
  next_starts_at: "2026-11-08T18:30:00Z",
};
const url = "https://example.org/mandirs/reading-hindu-temple#event-e1";

describe("eventData", () => {
  it("describes an event at a mandir", () => {
    const data = eventData(event, mandir, url);
    expect(data).toMatchObject({
      "@type": "Event",
      name: "Diwali celebrations",
      description: "Fireworks and prasad.",
      startDate: "2026-11-08T18:30:00.000Z",
      endDate: "2026-11-08T21:00:00.000Z",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        name: "Reading Hindu Temple",
        address: { postalCode: "RG1 7RD", addressCountry: "GB" },
      },
      organizer: { url: "https://www.readinghindutemple.co.uk/" },
      url,
    });
  });

  it("uses London dates for all-day events", () => {
    const data = eventData(
      {
        ...event,
        all_day: true,
        next_starts_at: "2026-11-07T23:30:00Z",
        ends_at: null,
      },
      mandir,
      url,
    );
    expect(data.startDate).toBe("2026-11-07");
    expect(data).not.toHaveProperty("endDate");
  });

  it("marks cancelled events and leaves out missing details", () => {
    const data = eventData(
      { ...event, status: "cancelled", summary: null },
      { ...mandir, postcode: null, website: null },
      url,
    );
    expect(data.eventStatus).toBe("https://schema.org/EventCancelled");
    expect(data).not.toHaveProperty("description");
    expect(data.location.address).not.toHaveProperty("postalCode");
    expect(data.organizer).not.toHaveProperty("url");
  });

  it("gives a repeating event its next date only", () => {
    const data = eventData(
      { ...event, recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA" },
      mandir,
      url,
    );
    expect(data).not.toHaveProperty("endDate");
  });
});

describe("scriptJson", () => {
  it("can't close the script tag early", () => {
    expect(scriptJson({ name: "</script><b>" })).not.toContain("</script>");
    expect(JSON.parse(scriptJson({ name: "</script>" }))).toEqual({
      name: "</script>",
    });
  });
});

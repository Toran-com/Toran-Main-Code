import { describe, expect, it } from "vitest";
import {
  eventPath,
  eventShareText,
  inviteShareText,
  whatsAppLink,
} from "@/lib/share";

const mandir = { name: "Reading Hindu Temple", town: "Reading" };
const event = {
  id: "e1",
  title: "Diwali celebrations",
  next_starts_at: "2026-11-08T18:30:00Z",
  all_day: false,
  recurrence: null,
};

describe("eventShareText", () => {
  it("says what, where and when, in London time", () => {
    expect(eventShareText(event, mandir)).toBe(
      "Diwali celebrations at Reading Hindu Temple, Reading: Sun 8 Nov, 6:30pm",
    );
  });

  it("says how often a repeating event happens", () => {
    expect(
      eventShareText(
        {
          ...event,
          title: "Aarti",
          next_starts_at: "2026-10-17T18:00:00Z",
          recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261231",
        },
        mandir,
      ),
    ).toBe(
      "Aarti at Reading Hindu Temple, Reading: Every Saturday, next Sat 17 Oct, 7pm",
    );
  });
});

describe("links", () => {
  it("points an event at its own page", () => {
    expect(eventPath("reading-hindu-temple", "e1")).toBe(
      "/mandirs/reading-hindu-temple/events/e1",
    );
  });

  it("puts the message and link on separate lines for WhatsApp", () => {
    const link = whatsAppLink("Garba & aarti", "https://example.org/a?b=1");
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(
      "Garba & aarti\nhttps://example.org/a?b=1",
    );
  });
});

describe("inviteShareText", () => {
  it("tells the colleague which address to log in with", () => {
    expect(inviteShareText(mandir, "b@example.com")).toBe(
      'I\'ve invited you to help run Reading Hindu Temple, Reading on Toran. Log in with b@example.com and press "Accept" on your account page (the invite lasts 14 days):',
    );
  });
});

import { describe, expect, it } from "vitest";
import { committeeMonthly } from "@/lib/committee-monthly";

const base = {
  mandir: { name: "Shree Ram Mandir", slug: "shree-ram-mandir-leicester" },
  numbers: {
    pageViews: 120,
    totals: { view: 300, calendar: 14, subscribe: 1, share: 9 },
  },
  siteUrl: "https://toran.example",
};

describe("committeeMonthly", () => {
  it("says how the page did, what's coming up and what to do", () => {
    const email = committeeMonthly({
      ...base,
      events: [
        { title: "Annakut darshan", next_starts_at: "2026-11-10T12:30:00Z" },
        {
          title: "Dev Diwali",
          next_starts_at: "2026-11-24T00:00:00Z",
          all_day: true,
        },
      ],
      tasks: [
        {
          title: "Check 2 posters",
          detail: "Someone sent them in for your page.",
        },
        {
          title: "Is “Annakut darshan” still on?",
          detail: "Press “Still on”.",
        },
      ],
    });
    expect(email.subject).toBe("Shree Ram Mandir: your month on Toran");
    expect(email.text).toContain(
      "- 120 visits to your page, and 180 visits to your events",
    );
    expect(email.text).toContain(
      "- 14 events added to calendars, 1 calendar subscription",
    );
    expect(email.text).toContain("- 9 shares on WhatsApp and elsewhere");
    expect(email.text).toContain("Coming up (2 events):");
    expect(email.text).toContain("- Tue 10 Nov, 12:30pm: Annakut darshan");
    expect(email.text).toContain("- Tue 24 Nov: Dev Diwali");
    expect(email.text).toContain(
      "- Check 2 posters. Someone sent them in for your page.",
    );
    expect(email.text).toContain(
      "- Is “Annakut darshan” still on? Press “Still on”.",
    );
    expect(email.text).toContain(
      "Your page: https://toran.example/manage/shree-ram-mandir-leicester",
    );
    expect(email.text).toContain('Reply "stop"');
  });

  it("lists five events and counts the rest", () => {
    const events = Array.from({ length: 7 }, (_, i) => ({
      title: `Aarti ${i + 1}`,
      next_starts_at: `2026-11-${String(10 + i).padStart(2, "0")}T18:00:00Z`,
    }));
    const { text } = committeeMonthly({ ...base, events, tasks: [] });
    expect(text).toContain("Aarti 5");
    expect(text).not.toContain("Aarti 6");
    expect(text).toContain("- and 2 more");
    expect(text).toContain("Nothing to do. Thank you");
  });

  it("nudges a committee with nothing coming up", () => {
    const { text } = committeeMonthly({
      ...base,
      numbers: {
        pageViews: 1,
        totals: { view: 1, calendar: 0, subscribe: 0, share: 0 },
      },
      events: [],
      tasks: [],
    });
    expect(text).toContain(
      "- 1 visit to your page, and 0 visits to your events",
    );
    expect(text).toContain("Nothing is coming up on your page.");
  });
});

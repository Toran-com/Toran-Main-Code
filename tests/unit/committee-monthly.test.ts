import { describe, expect, it } from "vitest";
import { committeeMonthly, emailHtml } from "@/lib/committee-monthly";

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
    // The preview has no link of its own; each email does.
    expect(email.text).toContain(
      "To stop it: (a link just for each committee member)",
    );
  });

  it("says who follows the mandir, and gives each member their stop link", () => {
    const { text } = committeeMonthly({
      ...base,
      events: [],
      tasks: [],
      supporters: {
        followers: 47,
        newFollowers: 7,
        asks: 3,
        newAsks: 0,
        went: 1,
        sevaTaken: 5,
      },
      stopUrl: "https://toran.example/committee-email/stop?u=a&m=b&c=c",
    });
    expect(text).toContain("- 47 people follow your mandir on Toran (7 new)");
    expect(text).toContain("- 1 person said they went to your events");
    expect(text).toContain("- 5 seva places taken on Toran");
    expect(text).toContain(
      "To stop it: https://toran.example/committee-email/stop?u=a&m=b&c=c",
    );
  });

  it("asks a committee nobody follows yet to share its page", () => {
    const { text } = committeeMonthly({
      ...base,
      events: [],
      tasks: [],
      supporters: {
        followers: 0,
        newFollowers: 0,
        asks: 0,
        newAsks: 0,
        went: 0,
        sevaTaken: 0,
      },
    });
    expect(text).toContain("Nobody follows your mandir on Toran yet");
    expect(text).not.toContain("said they went");
    expect(text).not.toContain("seva place");
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

describe("emailHtml", () => {
  it("makes paragraphs, lists and links, safely", () => {
    const html = emailHtml(
      "Namaste,\n\nHow it did:\n- 3 <visits>\n- 1 share\n\nYour page: https://toran.example/manage/x",
    );
    expect(html).toContain("<p>Namaste,</p>");
    expect(html).toContain("<p>How it did:</p>");
    expect(html).toContain(
      "<ul><li>3 &lt;visits&gt;</li><li>1 share</li></ul>",
    );
    expect(html).toContain(
      '<a href="https://toran.example/manage/x" style="color:#0b6b68">https://toran.example/manage/x</a>',
    );
  });
});

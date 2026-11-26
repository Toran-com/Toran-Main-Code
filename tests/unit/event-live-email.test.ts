import { describe, expect, it, vi } from "vitest";
import {
  eventLiveEmail,
  eventLiveEmailOn,
  sendEventLive,
} from "@/lib/event-live-email";
import { emailButton, emailLayout, escapeHtml } from "@/lib/email-layout";

const mandir = {
  name: "Shree <Ram> Mandir",
  town: "Kenton",
  slug: "shree-ram-mandir-kenton",
};
const diwali = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Diwali & Annakut",
  next_starts_at: "2026-11-08T18:30:00Z",
  all_day: false,
  recurrence: null,
};
const site = "https://toran.example";
const ON = {
  COMMITTEE_EMAIL: "on",
  RESEND_API_KEY: "re_test",
  DIGEST_FROM: "Toran <hello@toran.example>",
};

describe("eventLiveEmail, one event", () => {
  const email = eventLiveEmail({ mandir, events: [diwali], siteUrl: site });

  it("says it's live, with the event's link and a WhatsApp button", () => {
    expect(email.subject).toBe("It's live: Diwali & Annakut");
    const url = `${site}/mandirs/${mandir.slug}/events/${diwali.id}`;
    expect(email.text).toContain(`See it: ${url}`);
    expect(email.text).toContain("Share on WhatsApp: https://wa.me/?text=");
    expect(email.html).toContain(url);
    expect(email.html).toContain("Share on WhatsApp");
    expect(email.html).toContain("Your event is live");
  });

  it("shows the day in UK time on a date tile", () => {
    expect(email.html).toContain(">SUN<");
    expect(email.html).toContain(">8<");
    expect(email.html).toContain(">NOV<");
    expect(email.text).toContain("6:30pm");
  });

  it("escapes what the committee typed", () => {
    expect(email.html).toContain("Diwali &amp; Annakut");
    expect(email.html).toContain("Shree &lt;Ram&gt; Mandir");
    expect(email.html).not.toContain("<Ram>");
  });

  it("says why it came, and links to the committee page", () => {
    expect(email.text).toContain(`${site}/manage/${mandir.slug}`);
    expect(email.text).toContain("It's only sent when you add events.");
  });
});

describe("eventLiveEmail, several", () => {
  const events = Array.from({ length: 10 }, (_, i) => ({
    ...diwali,
    id: `11111111-1111-4111-8111-1111111111${String(i).padStart(2, "0")}`,
    title: `Event ${i + 1}`,
  }));
  const email = eventLiveEmail({ mandir, events, siteUrl: site });

  it("counts them in the subject and lists the first eight", () => {
    expect(email.subject).toBe(
      "10 events are live on Shree <Ram> Mandir's page",
    );
    expect(email.text).toContain("Event 8");
    expect(email.text).not.toContain("Event 9\n");
    expect(email.text).toContain("And 2 more:");
  });
});

describe("eventLiveEmailOn", () => {
  it("needs committee emails on and a sender", () => {
    expect(eventLiveEmailOn(ON)).toBe(true);
    expect(eventLiveEmailOn({ ...ON, COMMITTEE_EMAIL: "off" })).toBe(false);
    expect(eventLiveEmailOn({ ...ON, RESEND_API_KEY: undefined })).toBe(false);
  });
});

describe("sendEventLive", () => {
  it("sends to the person who added it", async () => {
    const send = vi.fn(async () => new Response("{}", { status: 200 }));
    const ok = await sendEventLive(
      "member@example.com",
      { mandir, events: [diwali], siteUrl: site },
      ON,
      send as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["member@example.com"]);
    expect(body.subject).toBe("It's live: Diwali & Annakut");
  });

  it("sends nothing while off, without an address or without events", async () => {
    const send = vi.fn();
    const content = { mandir, events: [diwali], siteUrl: site };
    const f = send as unknown as typeof fetch;
    expect(await sendEventLive("a@b.co", content, {}, f)).toBe(false);
    expect(await sendEventLive(null, content, ON, f)).toBe(false);
    expect(
      await sendEventLive("a@b.co", { ...content, events: [] }, ON, f),
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("email layout", () => {
  it("escapes quotes and links in buttons", () => {
    expect(escapeHtml(`"It's" <b>`)).toBe("&quot;It&#39;s&quot; &lt;b&gt;");
    expect(emailButton("https://x.example/?a=1&b=2", "Go")).toContain(
      'href="https://x.example/?a=1&amp;b=2"',
    );
  });

  it("is a whole page with the wordmark and the preheader", () => {
    const html = emailLayout({
      preheader: "Hidden line",
      heading: "Hello",
      blocks: ["<p>Body</p>"],
      footer: ["Small print"],
    });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(">Toran<");
    expect(html).toContain("Hidden line");
    expect(html).toContain("Small print");
  });
});

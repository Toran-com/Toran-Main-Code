import { describe, expect, it } from "vitest";
import {
  candidateLinks,
  eventsFromIcs,
  eventsFromJsonLd,
  eventsFromMicroformats,
  parseIcsStart,
  parseStart,
  patrikaLinks,
  plainText,
  robotsAllows,
  upcoming,
} from "@/lib/website-events";

const PAGE = "https://mandir.example.org/events/";

describe("plainText", () => {
  it("removes tags and decodes entities", () => {
    expect(plainText("<p>Garba &amp; dandiya<br>&#8211; all welcome</p>")).toBe(
      "Garba & dandiya – all welcome",
    );
  });
});

describe("parseStart", () => {
  it("reads a date as all day", () => {
    expect(parseStart("2026-11-08")).toEqual({ date: "2026-11-08", time: "" });
  });
  it("turns a time with an offset into London time", () => {
    expect(parseStart("2026-10-17T17:30:00Z")).toEqual({
      date: "2026-10-17",
      time: "18:30",
    });
    expect(parseStart("2026-11-08T18:30:00+00:00")).toEqual({
      date: "2026-11-08",
      time: "18:30",
    });
  });
  it("takes a time without an offset as London time", () => {
    expect(parseStart("2026-10-17T19:00:00")).toEqual({
      date: "2026-10-17",
      time: "19:00",
    });
  });
  it("refuses anything else", () => {
    expect(parseStart("next Saturday")).toBeNull();
  });
});

describe("eventsFromJsonLd", () => {
  const page = (json: string) =>
    `<html><head><script type="application/ld+json">${json}</script></head></html>`;

  it("finds a single event", () => {
    const html = page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Diwali &amp; Annakut",
        startDate: "2026-11-08T18:00:00+00:00",
        description: "<p>Fireworks at 8pm.</p>",
        url: "/events/diwali",
      }),
    );
    expect(eventsFromJsonLd(html, PAGE)).toEqual([
      {
        title: "Diwali & Annakut",
        date: "2026-11-08",
        time: "18:00",
        summary: "Fireworks at 8pm.",
        link: "https://mandir.example.org/events/diwali",
        kind: "festival",
      },
    ]);
  });

  it("finds events in a graph, a list and under an organisation", () => {
    const html =
      page(
        JSON.stringify({
          "@graph": [
            { "@type": "Organization", name: "Mandir" },
            {
              "@type": "MusicEvent",
              name: "Bhajan sandhya",
              startDate: "2026-10-20",
            },
          ],
        }),
      ) +
      page(
        JSON.stringify([
          { "@type": ["Event"], name: "Havan", startDate: "2026-10-25T10:00" },
        ]),
      ) +
      page(
        JSON.stringify({
          "@type": "HinduTemple",
          event: [
            { "@type": "Festival", name: "Navratri", startDate: "2026-10-11" },
          ],
        }),
      );
    expect(eventsFromJsonLd(html, PAGE).map((e) => e.title)).toEqual([
      "Bhajan sandhya",
      "Havan",
      "Navratri",
    ]);
  });

  it("uses the page as the link when the event has none", () => {
    const html = page(
      '{"@type":"Event","name":"Aarti","startDate":"2026-10-20"}',
    );
    expect(eventsFromJsonLd(html, PAGE)[0].link).toBe(PAGE);
  });

  it("skips broken blocks and events without a name or start", () => {
    const html =
      page("{ not json") +
      page('{"@type":"Event","name":"No date"}') +
      page('{"@type":"Event","startDate":"2026-10-20"}');
    expect(eventsFromJsonLd(html, PAGE)).toEqual([]);
  });

  it("shortens long descriptions at a word", () => {
    const long = "word ".repeat(100);
    const html = page(
      JSON.stringify({
        "@type": "Event",
        name: "Katha",
        startDate: "2026-10-20",
        description: long,
      }),
    );
    const { summary } = eventsFromJsonLd(html, PAGE)[0];
    expect(summary.length).toBeLessThanOrEqual(280);
    expect(summary.endsWith("word…")).toBe(true);
  });
});

describe("parseIcsStart", () => {
  it("reads all-day, UTC and London times", () => {
    expect(parseIcsStart(";VALUE=DATE", "20261108")).toEqual({
      date: "2026-11-08",
      time: "",
    });
    expect(parseIcsStart("", "20261017T173000Z")).toEqual({
      date: "2026-10-17",
      time: "18:30",
    });
    expect(parseIcsStart(";TZID=Europe/London", "20261017T190000")).toEqual({
      date: "2026-10-17",
      time: "19:00",
    });
  });
});

describe("eventsFromIcs", () => {
  const feed = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "SUMMARY:Diwali celebrations\\, fireworks",
    "DTSTART;TZID=Europe/London:20261108T180000",
    "DESCRIPTION:Bring your family.\\nAll welcome",
    "URL:https://mandir.example.org/diwali",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "SUMMARY:A very long event name that has been folded onto",
    "  the next line",
    "DTSTART;VALUE=DATE:20261109",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "SUMMARY:Called off",
    "STATUS:CANCELLED",
    "DTSTART:20261110T180000Z",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  it("reads each event, unfolding and unescaping", () => {
    expect(eventsFromIcs(feed, "https://mandir.example.org/cal.ics")).toEqual([
      {
        title: "Diwali celebrations, fireworks",
        date: "2026-11-08",
        time: "18:00",
        summary: "Bring your family. All welcome",
        link: "https://mandir.example.org/diwali",
        kind: "festival",
      },
      {
        title: "A very long event name that has been folded onto the next line",
        date: "2026-11-09",
        time: "",
        summary: "",
        link: "https://mandir.example.org/cal.ics",
        kind: "other",
      },
    ]);
  });
});

describe("candidateLinks", () => {
  it("finds same-site event pages and calendar feeds", () => {
    const html = `
      <a href="/whats-on">What's on</a>
      <a href="/events/#top">Events</a>
      <a href="/about">About</a>
      <a href="https://other.example.com/events">Elsewhere</a>
      <a href="webcal://mandir.example.org/feed.ics">Subscribe</a>
      <link rel="alternate" type="text/calendar" href="/calendar/export">`;
    expect(candidateLinks(html, "https://mandir.example.org/")).toEqual({
      pages: [
        "https://mandir.example.org/whats-on",
        "https://mandir.example.org/events/",
      ],
      feeds: [
        "https://mandir.example.org/feed.ics",
        "https://mandir.example.org/calendar/export",
      ],
    });
  });
});

describe("upcoming", () => {
  const now = new Date("2026-10-14T09:00:00Z");
  const e = (title: string, date: string) => ({
    title,
    date,
    time: "",
    summary: "",
    link: PAGE,
    kind: "other" as const,
  });

  it("keeps today to two years ahead, once per title and day", () => {
    expect(
      upcoming(
        [
          e("Past", "2026-10-13"),
          e("Today", "2026-10-14"),
          e("Today", "2026-10-14"),
          e("TODAY", "2026-10-14"),
          e("Far", "2030-01-01"),
        ],
        now,
      ).map((x) => x.title),
    ).toEqual(["Today"]);
  });
});

describe("robotsAllows", () => {
  const robots = `
    User-agent: *
    Disallow: /private/
    Allow: /private/events
    Disallow: /*.pdf$

    User-agent: BadBot
    Disallow: /
  `;

  it("follows the rules for everyone", () => {
    expect(robotsAllows(robots, "/", "ToranBot")).toBe(true);
    expect(robotsAllows(robots, "/private/admin", "ToranBot")).toBe(false);
    expect(robotsAllows(robots, "/private/events", "ToranBot")).toBe(true);
    expect(robotsAllows(robots, "/patrika.pdf", "ToranBot")).toBe(false);
    expect(robotsAllows(robots, "/patrika.pdf?x", "ToranBot")).toBe(true);
  });

  it("uses a group naming us over the general one", () => {
    const named = `${robots}\nUser-agent: ToranBot\nDisallow: /`;
    expect(robotsAllows(named, "/", "ToranBot/0.1")).toBe(false);
  });

  it("treats an empty Disallow as allowing everything", () => {
    expect(robotsAllows("User-agent: *\nDisallow:", "/x", "ToranBot")).toBe(
      true,
    );
  });

  it("allows everything when there are no rules", () => {
    expect(robotsAllows("", "/anything", "ToranBot")).toBe(true);
  });
});

describe("eventsFromMicroformats", () => {
  it("reads hCalendar events, with the start as a datetime or title", () => {
    const html = `
      <div class="vevent">
        <h3 class="summary">Diwali &amp; fireworks</h3>
        <time class="dtstart" datetime="2026-11-08T18:30:00+00:00">8 Nov</time>
        <p class="description">Puja, then <b>fireworks</b> at 8pm.</p>
        <a class="url" href="/events/diwali">More</a>
      </div>
      <li class="event vevent">
        <span class="summary">Annakut darshan</span>
        <abbr class="dtstart" title="20261109T1100">9 November, 11am</abbr>
      </li>
      <div class="vevent"><span class="summary">No date</span></div>`;
    expect(eventsFromMicroformats(html, PAGE)).toEqual([
      {
        title: "Diwali & fireworks",
        date: "2026-11-08",
        time: "18:30",
        summary: "Puja, then fireworks at 8pm.",
        link: "https://mandir.example.org/events/diwali",
        kind: "festival",
      },
      {
        title: "Annakut darshan",
        date: "2026-11-09",
        time: "11:00",
        summary: "",
        link: PAGE,
        kind: expect.any(String),
      },
    ]);
  });

  it("reads h-event, with a value-title start", () => {
    const html = `
      <article class="h-event">
        <a class="p-name u-url" href="https://mandir.example.org/garba">Sharad Purnima Garba</a>
        <span class="dt-start"><span class="value-title" title="2026-10-25"></span>Sunday</span>
      </article>`;
    expect(eventsFromMicroformats(html, PAGE)).toEqual([
      expect.objectContaining({
        title: "Sharad Purnima Garba",
        date: "2026-10-25",
        time: "",
      }),
    ]);
  });

  it("doesn't take a class that only contains the word", () => {
    const html = `
      <div class="vevent">
        <p class="entry-summary">Not the name</p>
        <span class="dtstart" title="2026-11-08">8 Nov</span>
      </div>`;
    expect(eventsFromMicroformats(html, PAGE)).toEqual([]);
  });
});

describe("patrikaLinks", () => {
  it("finds programme PDFs and event posters, not logos or other files", () => {
    const html = `
      <a href="/files/Diwali-2026-Patrika.pdf">Download</a>
      <a href="https://cdn.example.com/x/programme.pdf?v=2">Our <b>programme</b></a>
      <a href="/files/accounts-2025.pdf">Annual accounts</a>
      <a href="/files/membership.docx">Membership form</a>
      <img src="/uploads/navratri-poster.jpg" alt="">
      <img src="/uploads/IMG_2041.png" alt="Diwali programme poster" width="800">
      <img src="/uploads/logo.png" alt="Mandir logo">
      <img src="/uploads/diwali-thumb.jpg" alt="Diwali" width="120">
      <img src="/uploads/temple.jpg" alt="The mandir at night">`;
    expect(patrikaLinks(html, PAGE)).toEqual([
      {
        url: "https://mandir.example.org/files/Diwali-2026-Patrika.pdf",
        kind: "pdf",
        label: "Download",
      },
      {
        url: "https://cdn.example.com/x/programme.pdf?v=2",
        kind: "pdf",
        label: "Our programme",
      },
      {
        url: "https://mandir.example.org/uploads/navratri-poster.jpg",
        kind: "picture",
        label: "navratri-poster",
      },
      {
        url: "https://mandir.example.org/uploads/IMG_2041.png",
        kind: "picture",
        label: "Diwali programme poster",
      },
    ]);
  });

  it("keeps at most five", () => {
    const html = Array.from(
      { length: 8 },
      (_, i) => `<a href="/p/patrika-${i}.pdf">Patrika</a>`,
    ).join("");
    expect(patrikaLinks(html, PAGE)).toHaveLength(5);
  });
});

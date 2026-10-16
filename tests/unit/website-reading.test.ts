import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every host looks public; the network is a fake website served from a table.
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

import { guessKind } from "@/lib/event-kinds";
import { posterFrom } from "@/lib/posters";
import { checkWebsite } from "@/lib/website-check";
import {
  candidateLinks,
  eventPageLinks,
  eventsFromJsonLd,
  eventsFromMicrodata,
  eventsFromTribeApi,
  googleCalendarFeeds,
  mentionsDates,
  plainText,
  platformOf,
  shorten,
  timeIn,
} from "@/lib/website-events";

const PAGE = "https://mandir.example.org/events/";
const jsonLd = (data: object) =>
  `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

describe("plainText", () => {
  it("removes HTML that was encoded, and escape sequences left in", () => {
    // What The Events Calendar puts in its event data.
    expect(
      plainText(
        "&lt;p&gt;Join us on Sundays - 11:30am-1pm &amp;amp; 4:30pm-6:30pm - Chanting &amp; dancing.&lt;/p&gt;\\n",
      ),
    ).toBe(
      "Join us on Sundays - 11:30am-1pm & 4:30pm-6:30pm - Chanting & dancing.",
    );
  });

  it("drops page-builder shortcodes, comments and 'Read more'", () => {
    expect(
      plainText(
        "[vc_row][vc_column_text]<!-- x -->Havan at 9am.[/vc_column_text][/vc_row] Read more »",
      ),
    ).toBe("Havan at 9am.");
    expect(plainText("Garba every night of Navratri [&hellip;]")).toBe(
      "Garba every night of Navratri…",
    );
  });

  it("keeps text that only looks like a tag or shortcode", () => {
    expect(plainText("Ages <5 free [Free entry]")).toBe(
      "Ages <5 free [Free entry]",
    );
  });

  it("decodes curly quotes and dashes", () => {
    expect(plainText("Children&rsquo;s corner &ndash; 2&ndash;4pm")).toBe(
      "Children’s corner – 2–4pm",
    );
  });
});

describe("shorten", () => {
  it("ends at a sentence when one ends late enough", () => {
    const text = `${"Aarti and prasad for all the family. ".repeat(9)}More`;
    const short = shorten(text, 280);
    expect(short.endsWith("family.")).toBe(true);
    expect(short.length).toBeLessThanOrEqual(280);
  });
});

describe("timeIn", () => {
  it("reads the first time written in a description", () => {
    expect(timeIn("Sundays 11:30am-1pm & 4:30pm")).toBe("11:30");
    expect(timeIn("Doors open 6.30 pm")).toBe("18:30");
    expect(timeIn("Aarti at 7pm")).toBe("19:00");
    expect(timeIn("Starts 18:45")).toBe("18:45");
    expect(timeIn("12 noon")).toBeNull();
    expect(timeIn("On 11.10.2026")).toBeNull();
  });
});

describe("guessKind", () => {
  it("guesses the kind of event from its name and description", () => {
    expect(guessKind("Sharad Purnima Garba")).toBe("festival");
    expect(guessKind("Saturday sandhya aarti")).toBe("aarti");
    expect(guessKind("Sunday Love Feast")).toBe("community");
    expect(guessKind("Bhagavad Gita class")).toBe("katha");
    expect(guessKind("Bal Vihar for kids")).toBe("youth");
    expect(guessKind("Trustees' meeting")).toBe("other");
  });
});

describe("eventsFromJsonLd", () => {
  it("cleans The Events Calendar's data, finding the real time", () => {
    // Bhaktivedanta Manor's Sunday feast, as the first scanner saw it:
    // midnight, with the time only in the description.
    const html = jsonLd([
      {
        "@context": "http://schema.org",
        "@type": "Event",
        name: "Sunday Love Feast",
        description:
          "&lt;p&gt;Join us on Sundays - 11:30am-1pm &amp; 4:30pm-6:30pm - Chanting &amp; dancing, enlivening wisdom, culture &amp; entertainment, and of course the delicious prasadam (feast).&lt;/p&gt;\\n",
        startDate: "2026-10-18T00:00:00+01:00",
        endDate: "2026-10-18T23:59:59+01:00",
        url: "https://mandir.example.org/event/sunday-love-feast/2026-10-18/",
      },
    ]);
    expect(eventsFromJsonLd(html, PAGE)).toEqual([
      {
        title: "Sunday Love Feast",
        date: "2026-10-18",
        time: "11:30",
        summary:
          "Join us on Sundays - 11:30am-1pm & 4:30pm-6:30pm - Chanting & dancing, enlivening wisdom, culture & entertainment, and of course the delicious prasadam (feast).",
        link: "https://mandir.example.org/event/sunday-love-feast/2026-10-18/",
        kind: "community",
      },
    ]);
  });

  it("reads blocks with raw line breaks, and tidies names in capitals", () => {
    const html = `<script type="application/ld+json">{"@type":"Event","name":"DIWALI MELA AT THE MANDIR","startDate":"2026-11-07","description":"Stalls
and fireworks"}</script>`;
    const [event] = eventsFromJsonLd(html, PAGE);
    expect(event.title).toBe("Diwali Mela at the Mandir");
    expect(event.summary).toBe("Stalls and fireworks");
    expect(event.time).toBe("");
  });

  it("drops a description that only repeats the name", () => {
    const [event] = eventsFromJsonLd(
      jsonLd({
        "@type": "Event",
        name: "Hanuman Chalisa",
        description: "<p>Hanuman Chalisa</p>",
        startDate: "2026-10-20T19:00:00+01:00",
      }),
      PAGE,
    );
    expect(event.summary).toBe("");
    expect(event.time).toBe("19:00");
  });
});

describe("eventsFromMicrodata", () => {
  it("reads events marked up in the page itself", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Event">
        <h3 itemprop="name">Bhajan Sandhya</h3>
        <time itemprop="startDate" datetime="2026-10-24T19:30">24 Oct</time>
        <p itemprop="description">An evening of bhajans.</p>
        <a itemprop="url" href="/bhajan-sandhya">More</a>
      </div>
      <div itemscope itemtype="http://schema.org/Event">
        <span itemprop="name">No date</span>
      </div>`;
    expect(eventsFromMicrodata(html, PAGE)).toEqual([
      {
        title: "Bhajan Sandhya",
        date: "2026-10-24",
        time: "19:30",
        summary: "An evening of bhajans.",
        link: "https://mandir.example.org/bhajan-sandhya",
        kind: "bhajan",
      },
    ]);
  });
});

describe("eventsFromTribeApi", () => {
  it("reads The Events Calendar's list of events", () => {
    const json = JSON.stringify({
      events: [
        {
          title: "Annakut Darshan",
          excerpt: "<p>Over 1,000 dishes offered.</p>",
          description: "<p>Long description</p>",
          start_date: "2026-11-10 11:00:00",
          all_day: false,
          url: "https://mandir.example.org/event/annakut/",
        },
        {
          title: "Diwali",
          description: "",
          start_date: "2026-11-08 00:00:00",
          all_day: true,
          url: "https://mandir.example.org/event/diwali/",
        },
        { title: "Broken", start_date: "soon" },
      ],
    });
    expect(eventsFromTribeApi(json, PAGE)).toEqual([
      {
        title: "Annakut Darshan",
        date: "2026-11-10",
        time: "11:00",
        summary: "Over 1,000 dishes offered.",
        link: "https://mandir.example.org/event/annakut/",
        kind: "festival",
      },
      {
        title: "Diwali",
        date: "2026-11-08",
        time: "",
        summary: "",
        link: "https://mandir.example.org/event/diwali/",
        kind: "festival",
      },
    ]);
    expect(eventsFromTribeApi("not json", PAGE)).toEqual([]);
  });
});

describe("finding what to read next", () => {
  it("turns embedded Google Calendars into their feeds", () => {
    const html = `
      <iframe src="https://calendar.google.com/calendar/embed?src=mandir%40example.org&amp;ctz=Europe%2FLondon"></iframe>
      <a href="https://calendar.google.com/calendar/u/0?cid=ZXZlbnRzQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20">Add to Google</a>`;
    expect(googleCalendarFeeds(html)).toEqual([
      "https://calendar.google.com/calendar/ical/mandir%40example.org/public/basic.ics",
      "https://calendar.google.com/calendar/ical/events%40group.calendar.google.com/public/basic.ics",
    ]);
  });

  it("finds calendar exports and more kinds of events page", () => {
    const html = `
      <a href="/upcoming-events/">Upcoming</a>
      <a href="/utsav">Utsav</a>
      <a href="/events/?ical=1">Export events</a>
      <iframe src="https://calendar.google.com/calendar/embed?src=a%40b.org"></iframe>`;
    expect(candidateLinks(html, "https://mandir.example.org/")).toEqual({
      pages: [
        "https://mandir.example.org/upcoming-events/",
        "https://mandir.example.org/utsav",
      ],
      feeds: [
        "https://mandir.example.org/events/?ical=1",
        "https://calendar.google.com/calendar/ical/a%40b.org/public/basic.ics",
      ],
    });
  });

  it("finds single event pages on an events list", () => {
    const html = `
      <a href="/events/diwali-2026/">Diwali</a>
      <a href="/event/annakut?utm=x">Annakut</a>
      <a href="/events/page/2/">Next page</a>
      <a href="/events/category/festivals/">Festivals</a>
      <a href="https://elsewhere.org/events/x">Elsewhere</a>`;
    expect(eventPageLinks(html, PAGE)).toEqual([
      "https://mandir.example.org/events/diwali-2026/",
      "https://mandir.example.org/event/annakut",
    ]);
  });
});

describe("what kind of site it is", () => {
  it("knows the common site builders", () => {
    expect(platformOf('<link href="/wp-content/themes/x.css">')).toBe(
      "wordpress",
    );
    expect(platformOf('<img src="https://static.wixstatic.com/a.png">')).toBe(
      "wix",
    );
    expect(platformOf("<p>hand made</p>")).toBeNull();
  });

  it("notices dates written out for people", () => {
    expect(
      mentionsDates("<p>Diwali on 8th November, Annakut on Tuesday 10 Nov</p>"),
    ).toBe(true);
    expect(mentionsDates("<p>Open daily 7am to 8pm</p>")).toBe(false);
  });
});

describe("posterFrom", () => {
  it("keeps the guessed kind of a queued website event", () => {
    expect(
      posterFrom({
        title: "Garba",
        date: "2026-10-17",
        time: "20:00",
        summary: "",
        repeat: "none",
        until: "",
        from: "website",
        link: "",
        kind: "festival",
      })?.kind,
    ).toBe("festival");
  });
});

// ---- Reading whole websites -------------------------------------------------

const now = new Date("2026-10-14T09:00:00Z");
let site: Record<string, string>;
const fetched: string[] = [];

beforeEach(() => {
  fetched.length = 0;
  vi.stubGlobal("fetch", async (input: URL | string) => {
    const url = input.toString();
    fetched.push(url);
    return url in site
      ? new Response(site[url])
      : new Response("Not found", { status: 404 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("checkWebsite", () => {
  it("reads a WordPress site's events through The Events Calendar", async () => {
    site = {
      "https://wp.example.org/":
        '<link rel="https://api.w.org/" href="/wp-json/">',
      "https://wp.example.org/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-10-14":
        JSON.stringify({
          events: [
            {
              title: "Sharad Purnima Garba",
              description: "&lt;p&gt;Garba under the full moon&lt;/p&gt;",
              start_date: "2026-10-24 19:30:00",
              url: "https://wp.example.org/event/garba/",
            },
          ],
        }),
    };
    const result = await checkWebsite("https://wp.example.org/", now);
    expect(result.outcome).toBe("found");
    expect(result.events).toEqual([
      {
        title: "Sharad Purnima Garba",
        date: "2026-10-24",
        time: "19:30",
        summary: "Garba under the full moon",
        link: "https://wp.example.org/event/garba/",
        kind: "festival",
      },
    ]);
    expect(result.notes).toContain(
      "Built with WordPress and The Events Calendar: read its list of events.",
    );
  });

  it("reads a Google Calendar shown on an events page", async () => {
    site = {
      "https://cal.example.org/": '<a href="/whats-on">What\'s on</a>',
      "https://cal.example.org/whats-on":
        '<iframe src="https://calendar.google.com/calendar/embed?src=mandir%40cal.example.org"></iframe>',
      "https://calendar.google.com/calendar/ical/mandir%40cal.example.org/public/basic.ics":
        "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Satsang\nDTSTART:20261020T180000Z\nEND:VEVENT\nEND:VCALENDAR",
    };
    const result = await checkWebsite("https://cal.example.org/", now);
    expect(result.events.map((e) => `${e.title} ${e.date} ${e.time}`)).toEqual([
      "Satsang 2026-10-20 19:00",
    ]);
    expect(result.notes).toEqual([
      "Read 2 pages and 1 calendar feed.",
      "Read the Google Calendar shown on the site.",
    ]);
  });

  it("opens single event pages when the list itself has no data", async () => {
    site = {
      "https://list.example.org/": '<a href="/events">Events</a>',
      "https://list.example.org/events":
        '<a href="/events/diwali">Diwali</a><a href="/events/garba">Garba</a>',
      "https://list.example.org/events/diwali": jsonLd({
        "@type": "Event",
        name: "Diwali",
        startDate: "2026-11-08T18:00:00Z",
      }),
      "https://list.example.org/events/garba": jsonLd({
        "@type": "Event",
        name: "Garba",
        startDate: "2026-10-17T19:00:00+01:00",
      }),
    };
    const result = await checkWebsite("https://list.example.org/", now);
    expect(result.events.map((e) => e.title)).toEqual(["Diwali", "Garba"]);
    expect(result.pagesRead).toBe(4);
  });

  it("explains why nothing was found", async () => {
    site = {
      "https://wix.example.org/":
        '<img src="https://static.wixstatic.com/logo.png"><p>Navratri from 11 Oct to 19 Oct</p>',
    };
    expect((await checkWebsite("https://wix.example.org/", now)).notes).toEqual(
      [
        "Read 1 page.",
        "Built with Wix, whose event lists load inside the browser, so Toran can't read them yet.",
        "The site writes dates out for people (on a page or in a poster picture) but publishes no event data. Ask the committee to add events on Toran, or forward their posters.",
      ],
    );
  });
});

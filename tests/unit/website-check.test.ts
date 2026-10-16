import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every host looks public unless its name says otherwise; the network is a
// fake website served from a table.
vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => [
    {
      address: host.startsWith("private") ? "10.0.0.5" : "93.184.216.34",
      family: 4,
    },
  ],
}));

import { checkWebsite, isPrivateAddress } from "@/lib/website-check";
import { newEvents } from "@/lib/website-claims";

const now = new Date("2026-10-14T09:00:00Z");

let site: Record<string, { status?: number; body?: string; location?: string }>;
const fetched: string[] = [];

beforeEach(() => {
  fetched.length = 0;
  vi.stubGlobal("fetch", async (input: URL | string) => {
    const url = input.toString();
    fetched.push(url);
    const page = site[url];
    if (!page) return new Response("Not found", { status: 404 });
    return new Response(page.body ?? "", {
      status: page.status ?? 200,
      headers: page.location ? { location: page.location } : {},
    });
  });
});
afterEach(() => vi.unstubAllGlobals());

const jsonLd = (event: object) =>
  `<script type="application/ld+json">${JSON.stringify(event)}</script>`;

describe("checkWebsite", () => {
  it("reads the home page, an events page and a calendar feed", async () => {
    site = {
      "https://mandir.example.org/robots.txt": {
        body: "User-agent: *\nDisallow: /admin",
      },
      "https://mandir.example.org/": {
        body:
          jsonLd({
            "@type": "Event",
            name: "Diwali",
            startDate: "2026-11-08T18:00:00Z",
          }) + '<a href="/events">Events</a><a href="/admin/events">Admin</a>',
      },
      "https://mandir.example.org/events": {
        body:
          jsonLd({ "@type": "Event", name: "Garba", startDate: "2026-10-17" }) +
          jsonLd({
            "@type": "Event",
            name: "Last year",
            startDate: "2025-10-17",
          }) +
          '<a href="/feed.ics">Calendar</a>',
      },
      "https://mandir.example.org/feed.ics": {
        body: "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Havan\nDTSTART:20261025T100000Z\nEND:VEVENT\nEND:VCALENDAR",
      },
    };
    const result = await checkWebsite("https://mandir.example.org/", now);
    expect(result.outcome).toBe("found");
    expect(result.pagesRead).toBe(3);
    expect(result.events.map((e) => `${e.title} ${e.date} ${e.time}`)).toEqual([
      "Diwali 2026-11-08 18:00",
      "Garba 2026-10-17 ",
      // The clocks go back that morning, so 10:00 UTC is 10:00 in London.
      "Havan 2026-10-25 10:00",
    ]);
    // robots.txt keeps it out of /admin.
    expect(fetched).not.toContain("https://mandir.example.org/admin/events");
  });

  it("says when a site has nothing readable", async () => {
    site = {
      "https://plain.example.org/": { body: "<p>Diwali on 8 November</p>" },
    };
    expect(await checkWebsite("https://plain.example.org/", now)).toEqual({
      outcome: "none",
      events: [],
      pagesRead: 1,
      notes: ["Read 1 page.", "No events found on the pages read."],
    });
  });

  it("stays away when robots.txt says so", async () => {
    site = {
      "https://shy.example.org/robots.txt": {
        body: "User-agent: *\nDisallow: /",
      },
      "https://shy.example.org/": { body: "hello" },
    };
    expect((await checkWebsite("https://shy.example.org/", now)).outcome).toBe(
      "blocked",
    );
    expect(fetched).not.toContain("https://shy.example.org/");
  });

  it("follows redirects, but never into a private network", async () => {
    site = {
      "http://moved.example.org/": {
        status: 301,
        location: "https://moved.example.org/home",
      },
      "https://moved.example.org/home": {
        body: jsonLd({
          "@type": "Event",
          name: "Aarti",
          startDate: "2026-10-20",
        }),
      },
      "https://sneaky.example.org/": {
        status: 302,
        location: "http://private.example.org/",
      },
    };
    expect((await checkWebsite("http://moved.example.org/", now)).outcome).toBe(
      "found",
    );
    expect(
      (await checkWebsite("https://sneaky.example.org/", now)).outcome,
    ).toBe("unreachable");
    expect(fetched).not.toContain("http://private.example.org/");
  });

  it("refuses local and private addresses outright", async () => {
    for (const address of [
      "http://localhost:3000/",
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://private.example.org/",
      "ftp://mandir.example.org/",
      "not a web address",
    ]) {
      expect((await checkWebsite(address, now)).outcome).toBe("unreachable");
    }
    expect(fetched).toEqual([]);
  });
});

describe("isPrivateAddress", () => {
  it("knows private, loopback and link-local addresses", () => {
    for (const a of [
      "10.1.2.3",
      "127.0.0.1",
      "169.254.169.254",
      "172.20.0.1",
      "192.168.1.1",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(a)).toBe(true);
    }
    for (const a of [
      "93.184.216.34",
      "8.8.8.8",
      "172.32.0.1",
      "2a00:1450::1",
    ]) {
      expect(isPrivateAddress(a)).toBe(false);
    }
  });
});

describe("newEvents", () => {
  const e = (title: string, date: string) => ({
    title,
    date,
    time: "",
    summary: "",
    link: "",
    kind: "other" as const,
  });
  it("skips events already listed or queued, ignoring case", () => {
    expect(
      newEvents(
        [e("Diwali", "2026-11-08"), e("Garba", "2026-10-17")],
        [{ title: "diwali ", date: "2026-11-08" }],
      ).map((x) => x.title),
    ).toEqual(["Garba"]);
  });
  it("adds at most 20 at once", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      e(`Event ${i}`, "2026-11-01"),
    );
    expect(newEvents(many, [])).toHaveLength(20);
  });
});

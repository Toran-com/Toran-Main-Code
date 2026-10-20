import { describe, expect, it } from "vitest";
import {
  committeeTasks,
  committeeTodoCount,
  setupDone,
  setupSteps,
  type CommitteeFacts,
} from "@/lib/committee-tasks";

const NOW = new Date("2026-10-20T09:00:00Z");

// A committee that's set up and has nothing to do.
const settled: CommitteeFacts = {
  slug: "reading-hindu-temple",
  today: "2026-10-20",
  now: NOW,
  events: [
    {
      id: "e1",
      title: "Sunday aarti",
      status: "published",
      confirmed_at: "2026-10-18T10:00:00Z",
      next_starts_at: "2026-10-25T17:00:00Z",
    },
  ],
  posters: 0,
  festivals: [],
  shortShifts: [],
  eventsEver: 4,
  members: 2,
  invites: 0,
  details: { postcode: "RG1 1AA", website: "https://example.org", phone: null },
};

const keys = (f: CommitteeFacts) => committeeTasks(f).map((t) => t.key);

describe("setupSteps", () => {
  it("ticks off each step from what's already there", () => {
    expect(setupDone(settled)).toBe(true);
    const fresh = setupSteps({
      ...settled,
      eventsEver: 0,
      members: 1,
      details: { postcode: "RG1 1AA", website: null, phone: null },
    });
    expect(fresh.map((s) => [s.key, s.done])).toEqual([
      ["details", false],
      ["event", false],
      ["colleague", false],
    ]);
    // An invite sent counts as inviting a colleague.
    expect(setupSteps({ ...settled, members: 1, invites: 1 })[2].done).toBe(
      true,
    );
  });
});

describe("committeeTasks", () => {
  it("has nothing to do when everything is in order", () => {
    expect(committeeTasks(settled)).toEqual([]);
    expect(committeeTodoCount(settled)).toBe(0);
  });

  it("asks for posters to be checked first", () => {
    const tasks = committeeTasks({ ...settled, posters: 2 });
    expect(tasks[0]).toMatchObject({
      key: "posters",
      title: "Check 2 posters sent in for your mandir",
      href: "#posters",
    });
  });

  it("asks about events coming up that nobody has confirmed lately", () => {
    const old = {
      ...settled.events[0],
      confirmed_at: "2026-09-01T10:00:00Z",
    };
    expect(committeeTasks({ ...settled, events: [old] })[0]).toMatchObject({
      key: "confirm",
      title: "Is “Sunday aarti” still on?",
    });
    // Not for events a long way off, or cancelled ones.
    expect(
      keys({
        ...settled,
        events: [
          { ...old, next_starts_at: "2027-01-10T17:00:00Z" },
          { ...old, id: "e2", status: "cancelled" },
        ],
      }),
    ).toEqual([]);
    expect(
      committeeTasks({
        ...settled,
        events: [old, { ...old, id: "e2", confirmed_at: null }],
      })[0].title,
    ).toBe("Are 2 events coming up still on?");
  });

  it("points to the rota with the most places still free", () => {
    const tasks = committeeTasks({
      ...settled,
      shortShifts: [
        {
          eventId: "e1",
          eventTitle: "Diwali",
          starts_at: "2026-10-30T16:00:00Z",
          free: 3,
        },
        {
          eventId: "e1",
          eventTitle: "Diwali",
          starts_at: "2026-10-30T19:00:00Z",
          free: 2,
        },
        {
          eventId: "e9",
          eventTitle: "Annakut",
          starts_at: "2026-10-31T10:00:00Z",
          free: 1,
        },
      ],
    });
    expect(tasks[0]).toMatchObject({
      key: "seva",
      title: "5 seva places still free for Diwali (and 1 other event)",
      href: "/manage/reading-hindu-temple/seva/e1",
    });
  });

  it("mentions a festival only when it's close", () => {
    const at = (date: string) =>
      committeeTasks({ ...settled, festivals: [{ title: "Diwali", date }] });
    expect(at("2026-11-08")[0].title).toBe("Diwali is in 19 days");
    expect(at("2026-10-21")[0].title).toBe("Diwali is tomorrow");
    expect(at("2026-10-20")[0].title).toBe("Diwali is today");
    expect(at("2026-12-25")).toEqual([]);
  });

  it("says when the page has gone quiet", () => {
    expect(committeeTasks({ ...settled, events: [] })).toMatchObject([
      { key: "empty", href: "#add-event" },
    ]);
    // Not when a festival task already asks for an event.
    expect(
      keys({
        ...settled,
        events: [],
        festivals: [{ title: "Diwali", date: "2026-11-08" }],
      }),
    ).toEqual(["festival"]);
  });

  it("leaves the basics to the setup checklist while setting up", () => {
    const fresh = { ...settled, events: [], eventsEver: 0, members: 1 };
    expect(keys(fresh)).toEqual([]);
    expect(committeeTodoCount(fresh)).toBe(2);
    // A colleague leaving brings back "Invite a colleague".
    expect(setupSteps({ ...settled, members: 1 })[2].done).toBe(false);
  });
});

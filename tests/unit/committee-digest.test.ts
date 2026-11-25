import { describe, expect, it } from "vitest";
import {
  committeeDigest,
  type DigestContent,
  lastWeekStart,
  milestonePassed,
  weekFigures,
  weekKey,
  weekLabel,
} from "@/lib/committee-digest";
import {
  readDueDigests,
  runCommitteeDigest,
} from "@/lib/committee-digest-send";
import { stopCode } from "@/lib/committee-email";
import type { CommitteeFacts } from "@/lib/committee-tasks";
import { cardPath, change, readCard } from "@/lib/digest-card";
import type { Email } from "@/lib/weekly-email";

const SECRET = "test-secret";
const U1 = "aaaaaaaa-0000-4000-8000-000000000001";
const U2 = "aaaaaaaa-0000-4000-8000-000000000002";
const M1 = "10000000-0000-4000-8000-000000000001";
const E1 = "60000000-0000-4000-8000-000000000001";
const site = "https://toran.example";

describe("weeks", () => {
  it("finds last week's Monday from any day of this week", () => {
    expect(lastWeekStart("2026-11-23")).toBe("2026-11-16"); // Monday
    expect(lastWeekStart("2026-11-29")).toBe("2026-11-16"); // Sunday
    expect(lastWeekStart("2026-11-30")).toBe("2026-11-23");
  });

  it("names the week, across a month end too", () => {
    expect(weekLabel("2026-11-16")).toBe("16–22 Nov");
    expect(weekLabel("2026-11-30")).toBe("30 Nov – 6 Dec");
  });

  it("keys it by ISO week, the year of its Thursday", () => {
    expect(weekKey("2026-11-16")).toBe("2026-W47");
    expect(weekKey("2026-12-28")).toBe("2026-W53");
    expect(weekKey("2027-01-04")).toBe("2027-W01");
  });
});

const day = (d: string, metric: string, count: number) => ({
  day: d,
  metric,
  count,
});

const counts = {
  days: [
    // The week before.
    day("2026-11-09", "view", 10),
    day("2026-11-15", "view", 30),
    day("2026-11-12", "share", 2),
    // Last week.
    day("2026-11-16", "view", 20),
    day("2026-11-22", "view", 60),
    day("2026-11-22", "calendar", 4),
    day("2026-11-21", "subscribe", 1),
    day("2026-11-20", "share", 5),
    // Today, Monday: not in either week.
    day("2026-11-23", "view", 999),
  ],
  paths: [],
};

const figures = weekFigures({
  weekStart: "2026-11-16",
  counts,
  weekPaths: [
    { path: "/mandirs/m", metric: "view", count: 50 },
    { path: `/mandirs/m/events/${E1}`, metric: "view", count: 25 },
    {
      path: "/mandirs/m/events/70000000-0000-4000-8000-000000000002",
      metric: "view",
      count: 5,
    },
    { path: `/mandirs/m/events/${E1}`, metric: "share", count: 99 },
  ],
  supporters: {
    followers: 102,
    newFollowers: 5,
    asks: 0,
    newAsks: 0,
    went: 3,
    sevaTaken: 4,
  },
  supportersBoth: {
    followers: 102,
    newFollowers: 7,
    asks: 0,
    newAsks: 0,
    went: 3,
    sevaTaken: 6,
  },
});

describe("weekFigures", () => {
  it("counts each day of the week, Monday first, and the week before", () => {
    expect(figures.days).toEqual([20, 0, 0, 0, 0, 0, 60]);
    expect(figures.before).toEqual([10, 0, 0, 0, 0, 0, 30]);
    expect(figures.visits).toBe(80);
    expect(figures.visitsBefore).toBe(40);
  });

  it("adds calendar subscriptions to calendar adds, and compares", () => {
    expect(figures.calendar).toBe(5);
    expect(figures.shares).toBe(5);
    expect(figures.sharesBefore).toBe(2);
    expect(figures.newFollowersBefore).toBe(2);
    expect(figures.sevaTakenBefore).toBe(2);
  });

  it("picks the most visited event page", () => {
    expect(figures.topEvent).toEqual({ id: E1, views: 25 });
  });
});

describe("milestonePassed", () => {
  it("cheers a round number passed this week, and only then", () => {
    expect(milestonePassed(102, 5)).toBe(100);
    expect(milestonePassed(108, 5)).toBeNull();
    expect(milestonePassed(9, 9)).toBeNull();
    expect(milestonePassed(260, 200)).toBe(250);
  });
});

describe("the pictures", () => {
  const data = {
    kind: "week" as const,
    name: "Shree <Ram> Mandir",
    week: "16–22 Nov",
    days: [1, 2, 3, 4, 5, 6, 7],
    before: [0, 0, 0, 0, 0, 0, 0],
    followers: 12,
    newFollowers: 3,
  };

  it("are drawn only from a signed address", () => {
    const path = cardPath(data, SECRET)!;
    expect(path.startsWith("/api/digest/card?p=")).toBe(true);
    const q = new URLSearchParams(path.split("?")[1]);
    expect(readCard(q.get("p"), q.get("s"), SECRET)).toEqual(data);
    expect(readCard(q.get("p"), q.get("s"), "another-secret")).toBeNull();
    expect(readCard(`${q.get("p")}x`, q.get("s"), SECRET)).toBeNull();
    expect(readCard(q.get("p"), null, SECRET)).toBeNull();
    expect(cardPath(data, undefined)).toBeNull();
  });

  it("say how the week compares, in words", () => {
    expect(change(125, 100)).toBe("Up 25% on last week");
    expect(change(92, 100)).toBe("Down 8% on last week");
    expect(change(100, 100)).toBe("Same as last week");
    expect(change(5, 0)).toBeNull();
  });
});

const base: DigestContent = {
  mandir: { name: "Shree <Ram> Mandir", slug: "shree-ram-mandir" },
  weekStart: "2026-11-16",
  figures,
  topEvent: { id: E1, title: "Annakut & darshan", views: 25 },
  events: [{ title: "Gita Jayanti", next_starts_at: "2026-12-01T18:00:00Z" }],
  tasks: [{ title: "Add your phone number.", detail: "Families ring first." }],
  siteUrl: site,
  cards: {
    week: "/api/digest/card?p=w&s=1",
    share: "/api/digest/card?p=s&s=2",
  },
  stopUrl: `${site}/committee-email/stop?u=x`,
};

describe("committeeDigest", () => {
  const email = committeeDigest(base);

  it("leads with the week's visits and how they compare", () => {
    expect(email.subject).toBe(
      "Shree <Ram> Mandir: 80 visits this week, up 100%",
    );
    expect(email.html).toContain("Your week, 16–22 Nov");
    expect(email.html).toContain(`src="${site}/api/digest/card?p=w&amp;s=1"`);
    // The chart's words are there for anyone whose pictures are off.
    expect(email.html).toContain(
      'alt="Visits this week: 80. Up 100% on last week. Sunday was your busiest day, with 60 visits.',
    );
  });

  it("cheers 100 followers, and shows each tile against last week", () => {
    expect(email.html).toContain("You passed 100 followers this week");
    expect(email.html).toContain("New followers");
    expect(email.html).toContain("Seva places taken");
    expect(email.html).toContain("+3</span> on last week");
  });

  it("has the most visited event with a WhatsApp button, what's coming up and what to do", () => {
    expect(email.html).toContain("Annakut &amp; darshan");
    expect(email.html).toContain("Share it again");
    expect(email.text).toContain("Gita Jayanti");
    expect(email.text).toContain("Add your phone number. Families ring first.");
    expect(email.html).toContain("Share your week");
  });

  it("escapes names, links to the numbers, and has the stop link", () => {
    expect(email.html).not.toContain("<Ram>");
    expect(email.text).toContain(`${site}/manage/shree-ram-mandir/numbers`);
    expect(email.text).toContain(`To stop it: ${site}/committee-email/stop`);
  });

  it("is kind about a quiet week, and works without pictures", () => {
    const quiet = committeeDigest({
      ...base,
      figures: {
        ...figures,
        days: [0, 0, 0, 0, 0, 0, 0],
        visits: 0,
        visitsBefore: 0,
      },
      topEvent: null,
      events: [],
      tasks: [],
      cards: { week: null, share: null },
      stopUrl: undefined,
    });
    expect(quiet.subject).toBe("Shree <Ram> Mandir: your week on Toran");
    expect(quiet.text).toContain("A quiet week");
    expect(quiet.text).toContain("Nothing is coming up on your page");
    expect(quiet.html).toContain("Visits this week");
    expect(quiet.html).not.toContain("<img");
    expect(quiet.text).toContain("(a link just for each committee member)");
  });
});

const due = [
  {
    mandir: {
      id: M1,
      slug: "shree-ram-mandir",
      name: "Shree Ram Mandir",
      town: "Harrow",
      calendar: null,
      postcode: "HA1 1AA",
      website: null,
      phone: null,
    },
    recipients: [
      { user_id: U1, email: "one@example.com" },
      { user_id: U2, email: "two@example.com" },
      { user_id: U2, email: "not-an-address" },
    ],
    members: 2,
    counts,
    week_paths: [],
    supporters: { followers: 12, new_followers: 3 },
    supporters_both: { followers: 12, new_followers: 4 },
  },
];

function fakeDb(rows: unknown, error: unknown = null) {
  const inserted: { table: string; row: unknown }[] = [];
  const calls: unknown[] = [];
  const db = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return { data: rows, error };
    },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return { error: null };
      },
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  };
  return { db: db as never, inserted, calls };
}

const facts = async (): Promise<CommitteeFacts> =>
  ({
    slug: "shree-ram-mandir",
    today: "2026-11-23",
    now: new Date("2026-11-23T06:50:00Z"),
    events: [],
    posters: 0,
    festivals: [],
    shortShifts: [],
    eventsEver: 5,
    members: 2,
    invites: 0,
    details: { postcode: "HA1 1AA", website: null, phone: null },
  }) as unknown as CommitteeFacts;

describe("runCommitteeDigest", () => {
  const now = new Date("2026-11-23T06:50:00Z");

  it("emails each member last week's, with their own stop link, once a week", async () => {
    const { db, inserted, calls } = fakeDb(due);
    const sent: { to: string; email: Email }[] = [];
    const summary = await runCommitteeDigest(db, site, {
      send: async (to, email) => {
        sent.push({ to, email });
        return true;
      },
      code: (u, m) => stopCode(u, m, SECRET),
      card: (d) => cardPath(d, SECRET),
      now,
      loadFacts: facts,
    });
    expect(calls[0]).toEqual({
      fn: "committee_digests_due",
      args: { for_week: "2026-W47", week_start: "2026-11-16" },
    });
    expect(sent.map((s) => s.to)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
    expect(sent[0].email.subject).toBe(
      "Shree Ram Mandir: 80 visits this week, up 100%",
    );
    expect(sent[0].email.text).toContain(`stop?u=${U1}&m=${M1}&c=`);
    expect(sent[0].email.html).toContain("/api/digest/card?p=");
    expect(sent[1].email.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(summary).toEqual({
      week: "2026-W47",
      mandirs: 1,
      sent: 2,
      failed: 0,
      left: 0,
    });
    expect(inserted[0]).toEqual({
      table: "committee_emails_sent",
      row: { mandir_id: M1, month: "2026-W47", recipients: 2 },
    });
    expect(inserted[1]).toEqual({
      table: "job_runs",
      row: { job: "committee-digest", summary },
    });
  });

  it("leaves a mandir for the next run when every send failed", async () => {
    const { db, inserted } = fakeDb(due);
    const summary = await runCommitteeDigest(db, site, {
      send: async () => false,
      code: (u, m) => stopCode(u, m, SECRET),
      now,
      loadFacts: facts,
    });
    expect(summary).toMatchObject({ mandirs: 0, failed: 2, left: 1 });
    expect(inserted.map((i) => i.table)).toEqual(["job_runs"]);
  });

  it("stops starting committees when time is short", async () => {
    const { db } = fakeDb(due);
    const summary = await runCommitteeDigest(db, site, {
      send: async () => true,
      now,
      timeLeft: () => false,
      loadFacts: facts,
    });
    expect(summary.left).toBe(1);
  });

  it("reads only well-formed committees and addresses", () => {
    const rows = readDueDigests([...due, { mandir: { slug: "no-id" } }, null]);
    expect(rows).toHaveLength(1);
    expect(rows[0].recipients).toHaveLength(2);
  });
});

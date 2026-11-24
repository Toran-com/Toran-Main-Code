import { describe, expect, it } from "vitest";
import type { CommitteeFacts } from "@/lib/committee-tasks";
import {
  checkStopCode,
  committeeEmailOn,
  readDue,
  runCommitteeMonthly,
  stopCode,
  stopUrl,
} from "@/lib/committee-monthly-send";
import type { Email } from "@/lib/weekly-email";

const SECRET = "test-secret";
const U1 = "aaaaaaaa-0000-4000-8000-000000000001";
const U2 = "aaaaaaaa-0000-4000-8000-000000000002";
const M1 = "10000000-0000-4000-8000-000000000001";
const M2 = "20000000-0000-4000-8000-000000000002";

const mandir = (id: string, slug: string, name: string) => ({
  id,
  slug,
  name,
  town: "Harrow",
  calendar: null,
  postcode: "HA1 1AA",
  website: "https://example.org",
  phone: "020 0000 0000",
});

const due = [
  {
    mandir: mandir(M1, "mandir-one", "Mandir One"),
    recipients: [
      { user_id: U1, email: "one@example.com" },
      { user_id: U2, email: "two@example.com" },
    ],
    members: 2,
    paths: [{ path: "/mandirs/mandir-one", metric: "view", count: 40 }],
    supporters: { followers: 12, new_followers: 3, went: 2, seva_taken: 1 },
  },
  {
    mandir: mandir(M2, "mandir-two", "Mandir Two"),
    recipients: [],
    members: 1,
    paths: [],
    supporters: {},
  },
];

function fakeDb(rows: unknown, error: unknown = null) {
  const inserted: { table: string; row: unknown }[] = [];
  const db = {
    rpc: async () => ({ data: rows, error }),
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return { error: null };
      },
    }),
  };
  return { db: db as never, inserted };
}

const facts = async (): Promise<CommitteeFacts> =>
  ({
    slug: "mandir-one",
    today: "2026-12-03",
    now: new Date("2026-12-03T06:35:00Z"),
    events: [],
    posters: 0,
    festivals: [],
    shortShifts: [],
    eventsEver: 5,
    members: 2,
    invites: 0,
    details: {
      postcode: "HA1 1AA",
      website: "https://example.org",
      phone: "020 0000 0000",
    },
  }) as CommitteeFacts;

describe("the committee email's switch and stop links", () => {
  it("is off unless switched on", () => {
    expect(committeeEmailOn(undefined)).toBe(false);
    expect(committeeEmailOn("yes")).toBe(false);
    expect(committeeEmailOn("on")).toBe(true);
  });

  it("makes a stop code for one member and one mandir, that can't be reused", () => {
    const code = stopCode(U1, M1, SECRET)!;
    expect(checkStopCode(U1, M1, code, SECRET)).toBe(true);
    expect(checkStopCode(U2, M1, code, SECRET)).toBe(false);
    expect(checkStopCode(U1, M2, code, SECRET)).toBe(false);
    expect(checkStopCode(U1, M1, code, "another-secret")).toBe(false);
    expect(checkStopCode(U1, M1, `${code}x`, SECRET)).toBe(false);
    expect(checkStopCode("not-a-uuid", M1, code, SECRET)).toBe(false);
    expect(stopCode(U1, M1, undefined)).toBeNull();
    expect(stopUrl("https://toran.example", U1, M1, "abc")).toBe(
      `https://toran.example/committee-email/stop?u=${U1}&m=${M1}&c=abc`,
    );
  });

  it("reads only well-formed committees and addresses", () => {
    const rows = readDue([
      ...due,
      { mandir: { slug: "no-id" } },
      null,
      {
        mandir: mandir(M2, "x", "X"),
        recipients: [{ user_id: U1, email: "not-an-email" }],
      },
    ]);
    expect(rows.map((r) => r.mandir.slug)).toEqual([
      "mandir-one",
      "mandir-two",
      "x",
    ]);
    expect(rows[2].recipients).toEqual([]);
  });
});

describe("runCommitteeMonthly", () => {
  const now = new Date("2026-12-03T06:35:00Z");

  it("emails each member who wants it, with their own stop link, once a month", async () => {
    const { db, inserted } = fakeDb(due);
    const sent: { to: string; email: Email }[] = [];
    const summary = await runCommitteeMonthly(db, "https://toran.example", {
      send: async (to, email) => {
        sent.push({ to, email });
        return true;
      },
      code: (u, m) => stopCode(u, m, SECRET),
      now,
      loadFacts: facts,
    });
    expect(sent.map((s) => s.to)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
    const first = sent[0].email;
    expect(first.subject).toBe("Mandir One: your month on Toran");
    expect(first.text).toContain(
      "12 people follow your mandir on Toran (3 new)",
    );
    expect(first.text).toContain(
      `https://toran.example/committee-email/stop?u=${U1}&m=${M1}&c=`,
    );
    expect(sent[1].email.text).toContain(`stop?u=${U2}&m=${M1}`);
    expect(first.headers?.["List-Unsubscribe"]).toContain(
      `https://toran.example/api/committee-email/stop?u=${U1}`,
    );
    expect(first.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(first.html).toContain("<ul>");
    // Both mandirs are done for December: the one nobody wanted it for too.
    expect(inserted.filter((i) => i.table === "committee_emails_sent")).toEqual(
      [
        {
          table: "committee_emails_sent",
          row: { mandir_id: M1, month: "2026-12", recipients: 2 },
        },
        {
          table: "committee_emails_sent",
          row: { mandir_id: M2, month: "2026-12", recipients: 0 },
        },
      ],
    );
    expect(summary).toEqual({
      month: "2026-12",
      mandirs: 2,
      sent: 2,
      failed: 0,
      left: 0,
    });
    expect(inserted.at(-1)?.table).toBe("job_runs");
  });

  it("tries a mandir again next week when every send failed", async () => {
    const { db, inserted } = fakeDb([due[0]]);
    const summary = await runCommitteeMonthly(db, "https://toran.example", {
      send: async () => false,
      code: (u, m) => stopCode(u, m, SECRET),
      now,
      loadFacts: facts,
    });
    expect(summary).toMatchObject({ mandirs: 0, sent: 0, failed: 2, left: 1 });
    expect(inserted.filter((i) => i.table === "committee_emails_sent")).toEqual(
      [],
    );
  });

  it("stops when time's up, leaving the rest for next week", async () => {
    const { db } = fakeDb(due);
    let calls = 0;
    const summary = await runCommitteeMonthly(db, "https://toran.example", {
      send: async () => true,
      code: (u, m) => stopCode(u, m, SECRET),
      now,
      loadFacts: facts,
      timeLeft: () => calls++ < 1,
    });
    expect(summary).toMatchObject({ mandirs: 1, sent: 2, left: 1 });
  });

  it("sends nothing without the site's secret, or if committees can't be read", async () => {
    const noSecret = await runCommitteeMonthly(
      fakeDb([due[0]]).db,
      "https://toran.example",
      { send: async () => true, code: () => null, now, loadFacts: facts },
    );
    expect(noSecret).toMatchObject({ sent: 0, failed: 2, left: 1 });
    const broken = await runCommitteeMonthly(
      fakeDb(null, { message: "no" }).db,
      "https://toran.example",
      { send: async () => true, now, loadFacts: facts },
    );
    expect(broken.error).toBe("The committees couldn't be read.");
  });
});

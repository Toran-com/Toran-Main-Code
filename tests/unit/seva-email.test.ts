import { describe, expect, it } from "vitest";
import {
  checkStopCode,
  emailKind,
  stopCode,
  stopUrl,
  unsubscribeHeaders,
} from "@/lib/committee-monthly-send";
import {
  readSeva,
  runSevaRoundup,
  sevaEmailOn,
  sevaFullEmail,
  sevaRoundupEmail,
  tellIfSevaFull,
  type SevaSummary,
} from "@/lib/seva-email";
import type { Email } from "@/lib/weekly-email";

const SECRET = "test-secret";
const U1 = "aaaaaaaa-0000-4000-8000-000000000001";
const U2 = "aaaaaaaa-0000-4000-8000-000000000002";
const M1 = "10000000-0000-4000-8000-000000000001";
const site = "https://toran.example";
const mandir = {
  id: M1,
  slug: "shree-ram-mandir",
  name: "Shree <Ram> Mandir",
  town: "Harrow",
};

const kitchen: SevaSummary = {
  id: "50000000-0000-4000-8000-000000000001",
  name: "Kitchen",
  event: {
    id: "60000000-0000-4000-8000-000000000001",
    title: "Annakut darshan",
    starts_at: "2026-11-29T11:00:00Z",
    all_day: false,
  },
  shifts: [
    {
      starts_at: "2026-11-29T10:00:00Z",
      ends_at: "2026-11-29T12:00:00Z",
      needed: 4,
      taken: 3,
    },
    {
      starts_at: "2026-11-29T12:00:00Z",
      ends_at: "2026-11-29T14:00:00Z",
      needed: 2,
      taken: 2,
    },
  ],
  new: 3,
};
const parking: SevaSummary = {
  id: "50000000-0000-4000-8000-000000000002",
  name: "Car park",
  event: null,
  shifts: [
    {
      starts_at: "2026-11-29T09:00:00Z",
      ends_at: "2026-11-29T11:00:00Z",
      needed: 2,
      taken: 2,
    },
  ],
  new: 1,
};

describe("sevaRoundupEmail", () => {
  const email = sevaRoundupEmail({
    mandir,
    seva: [kitchen, parking],
    siteUrl: site,
    stopLink: `${site}/committee-email/stop?u=x&k=seva`,
  });

  it("counts the places taken across every seva", () => {
    expect(email.subject).toBe("4 seva places taken at Shree <Ram> Mandir");
    expect(email.html).toContain("4 seva places taken today");
    expect(email.html).toContain("+3 today");
    expect(email.html).toContain("+1 today");
  });

  it("shows how each time stands, in UK time, with full ones marked", () => {
    expect(email.text).toContain("Sun 29 Nov, 10am–12pm: 3 of 4 places taken");
    expect(email.text).toContain("Sun 29 Nov, 12pm–2pm: full");
    expect(email.html).toContain("3 of 4");
    expect(email.html).toContain("&#10003; Full");
    // The bar is three quarters full.
    expect(email.html).toContain('width="75%"');
    expect(email.text).toContain("For Annakut darshan, Sun 29 Nov, 11am");
    expect(email.text).toContain("Seva on its own");
  });

  it("asks for more on WhatsApp for a seva still short, linking its page", () => {
    expect(email.text).toContain("Ask for more on WhatsApp: https://wa.me/");
    expect(email.text).toContain(
      encodeURIComponent(
        `${site}/mandirs/shree-ram-mandir/events/${kitchen.event!.id}/seva`,
      ),
    );
  });

  it("escapes names and has the member's stop link", () => {
    expect(email.html).toContain("Shree &lt;Ram&gt; Mandir");
    expect(email.html).not.toContain("<Ram>");
    expect(email.text).toContain("To stop them: https://toran.example/");
    expect(email.html).toContain("Stop the seva emails");
  });

  it("says one place, not one places", () => {
    const one = sevaRoundupEmail({
      mandir,
      seva: [parking],
      siteUrl: site,
    });
    expect(one.subject).toBe("1 seva place taken at Shree <Ram> Mandir");
    // Everything is full: no WhatsApp ask.
    expect(one.text).not.toContain("wa.me");
  });
});

describe("sevaFullEmail", () => {
  it("says the seva is full, for which event, and how to open it again", () => {
    const full = { ...kitchen, new: undefined };
    full.shifts = full.shifts.map((s) => ({ ...s, taken: s.needed }));
    const email = sevaFullEmail({ mandir, seva: full, siteUrl: site });
    expect(email.subject).toBe("Seva full: Kitchen, for Annakut darshan");
    expect(email.html).toContain("Every place is taken");
    expect(email.text).toContain(
      "Kitchen at Shree <Ram> Mandir: every place is taken.",
    );
    expect(email.text).toContain("Add places or another time");
    expect(email.text).toContain(`${site}/manage/shree-ram-mandir/seva`);
  });
});

describe("readSeva", () => {
  it("keeps well-formed sevas and drops broken times", () => {
    expect(readSeva(null)).toBeNull();
    expect(readSeva({ name: "No id" })).toBeNull();
    const read = readSeva({
      ...kitchen,
      shifts: [...kitchen.shifts, { starts_at: 5 }, null],
    });
    expect(read?.shifts).toHaveLength(2);
    expect(read?.new).toBe(3);
  });
});

describe("seva stop links", () => {
  it("are their own: a monthly code doesn't stop the seva emails", () => {
    const monthly = stopCode(U1, M1, SECRET)!;
    const seva = stopCode(U1, M1, SECRET, "seva")!;
    expect(seva).not.toBe(monthly);
    expect(checkStopCode(U1, M1, seva, SECRET, "seva")).toBe(true);
    expect(checkStopCode(U1, M1, monthly, SECRET, "seva")).toBe(false);
    expect(checkStopCode(U1, M1, seva, SECRET)).toBe(false);
    expect(checkStopCode(U1, M1, monthly, SECRET)).toBe(true);
  });

  it("say which email in the address, and leave the monthly one as it was", () => {
    expect(stopUrl(site, U1, M1, "abc", "seva")).toBe(
      `${site}/committee-email/stop?u=${U1}&m=${M1}&c=abc&k=seva`,
    );
    expect(stopUrl(site, U1, M1, "abc")).toBe(
      `${site}/committee-email/stop?u=${U1}&m=${M1}&c=abc`,
    );
    expect(unsubscribeHeaders(site, U1, M1, "abc", "seva")).toEqual({
      "List-Unsubscribe": `<${site}/api/committee-email/stop?u=${U1}&m=${M1}&c=abc&k=seva>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(emailKind("seva")).toBe("seva");
    expect(emailKind("anything else")).toBe("monthly");
  });
});

describe("sevaEmailOn", () => {
  it("needs committee emails on and a sender", () => {
    const on = { COMMITTEE_EMAIL: "on", RESEND_API_KEY: "k", DIGEST_FROM: "f" };
    expect(sevaEmailOn(on)).toBe(true);
    expect(sevaEmailOn({ ...on, COMMITTEE_EMAIL: undefined })).toBe(false);
    expect(sevaEmailOn({ ...on, DIGEST_FROM: undefined })).toBe(false);
  });
});

function fakeDb(answer: unknown, error: unknown = null) {
  const inserted: { table: string; row: Record<string, unknown> }[] = [];
  const calls: { fn: string; args: unknown }[] = [];
  const db = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return { data: answer, error };
    },
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.push({ table, row });
        return { error: null };
      },
    }),
  };
  return { db: db as never, inserted, calls };
}

const recipients = [
  { user_id: U1, email: "one@example.com" },
  { user_id: U2, email: "two@example.com" },
  { user_id: U2, email: "not-an-address" },
];

describe("runSevaRoundup", () => {
  const now = new Date("2026-11-28T17:40:00Z");

  it("emails each member once per mandir, each with their own stop link, and marks it done", async () => {
    const { db, inserted, calls } = fakeDb([
      { mandir, recipients, seva: [kitchen, parking] },
    ]);
    const sent: { to: string; email: Email }[] = [];
    const summary = await runSevaRoundup(db, site, {
      send: async (to, email) => {
        sent.push({ to, email });
        return true;
      },
      code: (u, m) => stopCode(u, m, SECRET, "seva"),
      now,
    });
    expect(calls[0]).toEqual({
      fn: "seva_roundups_due",
      args: { until: now.toISOString() },
    });
    expect(sent.map((s) => s.to)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
    expect(sent[0].email.text).toContain(`u=${U1}&m=${M1}`);
    expect(sent[0].email.text).toContain("&k=seva");
    expect(sent[0].email.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(summary).toEqual({ mandirs: 1, places: 4, sent: 2, failed: 0 });
    expect(inserted).toEqual([
      {
        table: "seva_roundups_sent",
        row: {
          mandir_id: M1,
          through: now.toISOString(),
          places: 4,
          recipients: 2,
        },
      },
      { table: "job_runs", row: { job: "seva-roundup", summary } },
    ]);
  });

  it("tries again tomorrow when every send failed", async () => {
    const { db, inserted } = fakeDb([{ mandir, recipients, seva: [kitchen] }]);
    const summary = await runSevaRoundup(db, site, {
      send: async () => false,
      code: (u, m) => stopCode(u, m, SECRET, "seva"),
      now,
    });
    expect(summary.failed).toBe(2);
    expect(summary.mandirs).toBe(0);
    expect(inserted.map((i) => i.table)).toEqual(["job_runs"]);
  });

  it("says so when the database can't be read", async () => {
    const { db } = fakeDb(null, { message: "down" });
    const summary = await runSevaRoundup(db, site, {
      send: async () => true,
      now,
    });
    expect(summary.error).toBe("The seva places couldn't be read.");
  });
});

describe("tellIfSevaFull", () => {
  it("emails the committee when the database says it just filled", async () => {
    const full = { ...kitchen, new: undefined };
    const { db, calls } = fakeDb({ mandir, recipients, seva: full });
    const sent: string[] = [];
    const count = await tellIfSevaFull(db, "shift-1", site, {
      send: async (to, email) => {
        sent.push(`${to}: ${email.subject}`);
        return true;
      },
      code: (u, m) => stopCode(u, m, SECRET, "seva"),
    });
    expect(calls[0]).toEqual({
      fn: "seva_full_notice",
      args: { target_shift: "shift-1" },
    });
    expect(count).toBe(2);
    expect(sent[0]).toBe(
      "one@example.com: Seva full: Kitchen, for Annakut darshan",
    );
  });

  it("sends nothing when it isn't full (or was already told)", async () => {
    const { db } = fakeDb(null);
    let sends = 0;
    expect(
      await tellIfSevaFull(db, "shift-1", site, {
        send: async () => {
          sends++;
          return true;
        },
      }),
    ).toBe(0);
    expect(sends).toBe(0);
  });
});

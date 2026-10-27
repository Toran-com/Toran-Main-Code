import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { mailerReady, sendEmail } from "@/lib/mailer";
import {
  checkSignup,
  confirmEmail,
  hashCode,
  isCode,
  leaveCode,
  newCode,
  weeklyEmail,
  weeklyEmailOn,
} from "@/lib/weekly-email";
import { MAX_PER_RUN, runWeekly } from "@/lib/weekly-send";
import type { ListedEvent } from "@/lib/whats-on";

const SITE = "https://toran.example";

describe("switching it on", () => {
  it("is off unless the setting is exactly on", () => {
    expect(weeklyEmailOn(undefined)).toBe(false);
    expect(weeklyEmailOn("")).toBe(false);
    expect(weeklyEmailOn("true")).toBe(false);
    expect(weeklyEmailOn("on")).toBe(true);
  });

  it("sends nothing without a key and a from address", () => {
    expect(mailerReady({})).toBe(false);
    expect(mailerReady({ RESEND_API_KEY: "k" })).toBe(false);
    expect(mailerReady({ RESEND_API_KEY: "k", DIGEST_FROM: "a@b.uk" })).toBe(
      true,
    );
  });
});

describe("checkSignup", () => {
  it("tidies the address and keeps a known region", () => {
    expect(checkSignup("  Asha@Example.COM ", "London")).toEqual({
      ok: true,
      email: "asha@example.com",
      region: "London",
    });
    expect(checkSignup("asha@example.com", "")).toEqual({
      ok: true,
      email: "asha@example.com",
      region: null,
    });
  });

  it("refuses what isn't an address or a region", () => {
    expect(checkSignup("asha", "")).toEqual({ ok: false, error: "email" });
    expect(checkSignup("a b@example.com", "")).toEqual({
      ok: false,
      error: "email",
    });
    expect(checkSignup("asha@example.com", "Narnia")).toEqual({
      ok: false,
      error: "region",
    });
  });
});

describe("codes", () => {
  it("makes new codes that pass the check", () => {
    const a = newCode();
    expect(isCode(a)).toBe(true);
    expect(newCode()).not.toBe(a);
    expect(isCode("short")).toBe(false);
    expect(isCode(`${a.slice(0, 31)}!`)).toBe(false);
    expect(hashCode(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives one address the same unsubscribe code every week", () => {
    const code = leaveCode("Asha@example.com", "secret");
    expect(code && isCode(code)).toBe(true);
    expect(leaveCode(" asha@example.com", "secret")).toBe(code);
    expect(leaveCode("ravi@example.com", "secret")).not.toBe(code);
    expect(leaveCode("asha@example.com", "other")).not.toBe(code);
  });

  it("can't make one without the site's secret", () => {
    expect(leaveCode("asha@example.com", undefined)).toBeNull();
    expect(leaveCode("asha@example.com", "")).toBeNull();
  });
});

describe("the emails", () => {
  it("asks to confirm, with the link", () => {
    const email = confirmEmail(SITE, "c".repeat(32), "London");
    expect(email.text).toContain(
      `${SITE}/weekly/confirm?code=${"c".repeat(32)}`,
    );
    expect(email.text).toContain("in London");
    expect(email.html).toContain("Yes, send me the weekly email");
    expect(email.headers).toBeUndefined();
  });

  it("has a way to leave in the text, the HTML and the headers", () => {
    const email = weeklyEmail(
      { subject: "What's on", text: "Events", html: "<p>Events</p>" },
      SITE,
      "l".repeat(32),
    );
    const leave = `${SITE}/weekly/leave?code=${"l".repeat(32)}`;
    expect(email.text).toContain(leave);
    expect(email.html).toContain(leave);
    expect(email.html).toContain("Stop these emails");
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${SITE}/api/weekly/leave?code=${"l".repeat(32)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("sendEmail", () => {
  const env = { RESEND_API_KEY: "key", DIGEST_FROM: "Toran <w@toran.uk>" };
  const email = { subject: "S", text: "T", html: "<p>H</p>" };

  it("posts to the sender with the key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    expect(await sendEmail("asha@example.com", email, env, fake)).toBe(true);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(
      (calls[0].init.headers as Record<string, string>).authorization,
    ).toBe("Bearer key");
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      from: env.DIGEST_FROM,
      to: ["asha@example.com"],
      subject: "S",
    });
  });

  it("says no when the sender refuses or can't be reached", async () => {
    const refused = (async () =>
      new Response("", { status: 422 })) as unknown as typeof fetch;
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await sendEmail("a@b.uk", email, env, refused)).toBe(false);
    expect(await sendEmail("a@b.uk", email, env, down)).toBe(false);
    expect(await sendEmail("a@b.uk", email, {}, refused)).toBe(false);
  });
});

// A stand-in for the database: the subscribers it's asked for, and what
// was written back.
function fakeDb(rows: { id: string; email: string; region: string | null }[]) {
  const written: { table: string; op: string; value: unknown }[] = [];
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "not", "or", "order", "limit", "eq"])
      builder[name] = () => builder;
    builder.insert = (value: unknown) => {
      written.push({ table, op: "insert", value });
      return builder;
    };
    builder.update = (value: unknown) => {
      written.push({ table, op: "update", value });
      return builder;
    };
    builder.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: table === "digest_subscribers" ? rows : null });
    return builder;
  };
  return { db: { from } as unknown as SupabaseClient<Database>, written };
}

const now = new Date("2026-10-29T06:35:00Z");

function event(title: string, region: string): ListedEvent {
  return {
    id: title,
    title,
    title_gu: null,
    summary: null,
    kind: "other",
    confirmed_at: null,
    origin: null,
    all_day: false,
    status: "published",
    recurrence: null,
    link: null,
    next_starts_at: "2026-10-31T18:00:00Z",
    mandir: {
      slug: "a-mandir",
      name: "A Mandir",
      town: "Leicester",
      region,
      latitude: null,
      longitude: null,
    },
  };
}

describe("runWeekly", () => {
  const data = {
    events: [
      event("Diwali in Leicester", "East Midlands"),
      event("Diwali in Harrow", "London"),
    ],
    dates: [],
  };

  it("sends each person their region's week, with their own way out", async () => {
    const { db, written } = fakeDb([
      { id: "1", email: "asha@example.com", region: "London" },
      { id: "2", email: "ravi@example.com", region: null },
    ]);
    const sent: { to: string; text: string; leave?: string }[] = [];
    const summary = await runWeekly(db, data, SITE, {
      now,
      leaveCode: (e) => leaveCode(e, "secret"),
      send: async (to, email) => {
        sent.push({
          to,
          text: email.text,
          leave: email.headers?.["List-Unsubscribe"],
        });
        return true;
      },
    });
    expect(summary).toEqual({ sent: 2, failed: 0, more: false });
    expect(sent[0].text).toContain("Diwali in Harrow");
    expect(sent[0].text).not.toContain("Diwali in Leicester");
    expect(sent[1].text).toContain("Diwali in Leicester");
    expect(sent[0].leave).not.toBe(sent[1].leave);
    expect(written.filter((w) => w.op === "update")).toHaveLength(2);
    expect(written.at(-1)).toEqual({
      table: "job_runs",
      op: "insert",
      value: { job: "weekly", summary },
    });
  });

  it("doesn't mark a failed send as sent, or send without a way out", async () => {
    const { db, written } = fakeDb([
      { id: "1", email: "asha@example.com", region: null },
    ]);
    const failed = await runWeekly(db, data, SITE, {
      now,
      leaveCode: () => "l".repeat(32),
      send: async () => false,
    });
    expect(failed).toEqual({ sent: 0, failed: 1, more: false });
    let tried = false;
    const noSecret = await runWeekly(db, data, SITE, {
      now,
      leaveCode: () => null,
      send: async () => (tried = true),
    });
    expect(noSecret.failed).toBe(1);
    expect(tried).toBe(false);
    expect(written.some((w) => w.op === "update")).toBe(false);
  });

  it("leaves the rest for the next run when there are too many", async () => {
    const rows = Array.from({ length: MAX_PER_RUN + 1 }, (_, i) => ({
      id: String(i),
      email: `p${i}@example.com`,
      region: null,
    }));
    const { db } = fakeDb(rows);
    let count = 0;
    const summary = await runWeekly(db, data, SITE, {
      now,
      leaveCode: () => "l".repeat(32),
      send: async () => (count++, true),
    });
    expect(summary).toEqual({ sent: MAX_PER_RUN, failed: 0, more: true });
    expect(count).toBe(MAX_PER_RUN);
  });
});

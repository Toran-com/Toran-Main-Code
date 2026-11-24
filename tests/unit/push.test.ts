import { describe, expect, it } from "vitest";
import { digestMessage, noticeMessage } from "@/lib/push-digest";
import {
  pushReady,
  pushTo,
  readSubscription,
  runDailyPush,
  type Send,
} from "@/lib/push";

const ENV = {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
  VAPID_PRIVATE_KEY: "private",
  VAPID_SUBJECT: "mailto:hello@example.org",
};

describe("digestMessage", () => {
  const news = new Map([
    [
      "shree-ram",
      {
        name: "Shree Ram Mandir",
        events: [
          { title: "Diwali darshan", when: "Sat 8 Nov, 6pm" },
          { title: "Annakut", when: "Sun 9 Nov, 11am" },
        ],
      },
    ],
    [
      "geeta-bhavan",
      { name: "Geeta Bhavan", events: [{ title: "Satsang", when: "Fri" }] },
    ],
  ]);

  it("says what's new at one mandir, opening its page", () => {
    expect(digestMessage(["shree-ram", "other"], news)).toEqual({
      title: "New at Shree Ram Mandir",
      body: "Diwali darshan, Sat 8 Nov, 6pm, and 1 more",
      url: "/mandirs/shree-ram",
      tag: "toran-new-events",
    });
  });

  it("puts several mandirs in one notification, opening What's on for them", () => {
    const m = digestMessage(["geeta-bhavan", "shree-ram"], news)!;
    expect(m.title).toBe("3 new events at your mandirs");
    expect(m.body).toBe(
      "Geeta Bhavan: Satsang · Shree Ram Mandir: Diwali darshan +1",
    );
    expect(m.url).toBe("/whats-on?mandirs=geeta-bhavan,shree-ram");
  });

  it("sends nothing when nothing's new at the mandirs followed", () => {
    expect(digestMessage(["other"], news)).toBeNull();
    expect(digestMessage([], news)).toBeNull();
  });

  it("keeps a notice short", () => {
    const m = noticeMessage({ slug: "x", name: "X Mandir" }, "a".repeat(300));
    expect(m.title).toBe("X Mandir: notice");
    expect(m.body).toHaveLength(160);
    expect(m.body.endsWith("…")).toBe(true);
    expect(m.url).toBe("/mandirs/x");
  });
});

describe("readSubscription", () => {
  const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };
  it("takes a real push service's address and keys", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://jmt17.google.com/fcm/send/abc",
      "https://web.push.apple.com/QGx",
      "https://updates.push.services.mozilla.com/wpush/v2/x",
      "https://wns2-db5p.notify.windows.com/w/?token=x",
    ]) {
      expect(readSubscription({ endpoint, keys })?.endpoint).toBe(endpoint);
    }
  });
  it("refuses anything else", () => {
    expect(readSubscription(null)).toBeNull();
    expect(
      readSubscription({ endpoint: "https://evil.example.com/x", keys }),
    ).toBeNull();
    expect(
      readSubscription({ endpoint: "http://fcm.googleapis.com/x", keys }),
    ).toBeNull();
    expect(
      readSubscription({
        endpoint: "https://fcm.googleapis.com/x",
        keys: { p256dh: "short", auth: keys.auth },
      }),
    ).toBeNull();
    expect(
      readSubscription({
        endpoint: "https://fcm.googleapis.com/x",
        keys: { p256dh: keys.p256dh, auth: "<script>alert(1)</script>" },
      }),
    ).toBeNull();
  });
});

// A stand-in for the database: records what was asked, answers from
// `data`.
function fakeDb(data: Record<string, unknown[]> = {}) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const chain = (table: string) => {
    const result = { data: data[table] ?? [], error: null, count: 2 };
    const proxy: Record<string, unknown> = {};
    for (const m of [
      "eq",
      "lt",
      "gte",
      "in",
      "order",
      "limit",
      "contains",
      "select",
    ]) {
      proxy[m] = (...args: unknown[]) => {
        calls.push({ table, op: m, args });
        return proxy;
      };
    }
    proxy.then = (resolve: (v: unknown) => void) => resolve(result);
    return proxy;
  };
  const db = {
    from: (table: string) => ({
      select: (...args: unknown[]) => {
        calls.push({ table, op: "select", args });
        return chain(table);
      },
      delete: (...args: unknown[]) => {
        calls.push({ table, op: "delete", args });
        return chain(table);
      },
      update: (...args: unknown[]) => {
        calls.push({ table, op: "update", args });
        return chain(table);
      },
      insert: async (...args: unknown[]) => {
        calls.push({ table, op: "insert", args });
        return { error: null };
      },
    }),
  };
  return { db: db as never, calls };
}

const SUB = {
  id: "s1",
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  p256dh: "p",
  auth: "a",
  mandirs: ["shree-ram"],
  last_digest_at: "2026-11-23T17:05:00Z",
};

describe("pushTo", () => {
  it("is off without Toran's keys", () => {
    expect(pushReady({})).toBe(false);
    expect(pushReady(ENV)).toBe(true);
  });

  it("sends the message, signed with Toran's keys", async () => {
    const { db } = fakeDb();
    const sent: unknown[][] = [];
    const send: Send = async (...args) => {
      sent.push(args);
    };
    const r = await pushTo(
      db,
      SUB,
      noticeMessage({ slug: "x", name: "X" }, "Closed"),
      ENV,
      send,
    );
    expect(r).toBe("sent");
    expect(sent[0][0]).toEqual({
      endpoint: SUB.endpoint,
      keys: { p256dh: "p", auth: "a" },
    });
    expect(JSON.parse(sent[0][1] as string).body).toBe("Closed");
    expect((sent[0][2] as { vapidDetails: unknown }).vapidDetails).toEqual({
      subject: ENV.VAPID_SUBJECT,
      publicKey: "public",
      privateKey: "private",
    });
  });

  it("deletes a push address its service says is gone", async () => {
    const { db, calls } = fakeDb();
    const gone: Send = async () => {
      throw Object.assign(new Error("Gone"), { statusCode: 410 });
    };
    expect(
      await pushTo(db, SUB, noticeMessage(SUB as never, "x"), ENV, gone),
    ).toBe("gone");
    expect(calls).toContainEqual({
      table: "push_subscriptions",
      op: "delete",
      args: [],
    });
    const failing: Send = async () => {
      throw Object.assign(new Error("Busy"), { statusCode: 503 });
    };
    expect(
      await pushTo(db, SUB, noticeMessage(SUB as never, "x"), ENV, failing),
    ).toBe("failed");
  });
});

describe("runDailyPush", () => {
  it("sends each browser one notification of what's new since its last", async () => {
    const { db, calls } = fakeDb({
      push_subscriptions: [SUB, { ...SUB, id: "s2", mandirs: ["other"] }],
      events: [
        {
          title: "Diwali darshan",
          starts_at: "2026-11-30T18:00:00Z",
          all_day: false,
          created_at: "2026-11-24T09:00:00Z",
          origin: "committee",
          mandir: { slug: "shree-ram", name: "Shree Ram Mandir" },
        },
        {
          title: "Old news",
          starts_at: "2026-11-30T18:00:00Z",
          all_day: false,
          created_at: "2026-11-23T09:00:00Z",
          origin: "committee",
          mandir: { slug: "shree-ram", name: "Shree Ram Mandir" },
        },
        {
          title: "Daily aarti",
          starts_at: "2026-11-30T18:00:00Z",
          all_day: false,
          created_at: "2026-11-24T09:00:00Z",
          origin: "aarti",
          mandir: { slug: "shree-ram", name: "Shree Ram Mandir" },
        },
      ],
    });
    const sent: string[] = [];
    const summary = await runDailyPush(
      db,
      new Date("2026-11-24T17:05:00Z"),
      ENV,
      async (_s, payload) => {
        sent.push(payload);
      },
    );
    // Only the first browser follows a mandir with news, and only the
    // event added since its last notification (not the daily aarti).
    expect(sent.map((p) => JSON.parse(p))).toEqual([
      {
        title: "New at Shree Ram Mandir",
        body: "Diwali darshan, Mon 30 Nov, 6pm",
        url: "/mandirs/shree-ram",
        tag: "toran-new-events",
      },
    ]);
    expect(summary).toMatchObject({ sent: 1, subscriptions: 2, newEvents: 2 });
    expect(calls).toContainEqual({
      table: "push_subscriptions",
      op: "update",
      args: [{ last_digest_at: "2026-11-24T17:05:00.000Z" }],
    });
    expect(calls.at(-1)).toMatchObject({ table: "job_runs", op: "insert" });
  });

  it("only tidies up old push addresses without Toran's keys", async () => {
    const { db, calls } = fakeDb({ push_subscriptions: [SUB] });
    const summary = await runDailyPush(db, new Date(), {}, async () => {});
    expect(summary).toMatchObject({ sent: 0, removedOld: 2 });
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });
});

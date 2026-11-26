import { describe, expect, it, vi } from "vitest";
import type { EventInput } from "@/lib/event-form";
import {
  EMAILS_PER_DAY,
  addressOf,
  addressedSlugs,
  clock,
  forwardingAddress,
  handleInboundEmail,
  inboundDomain,
  inboundEmailOn,
  inboundReply,
  isAuthentic,
  messageText,
  pickMandir,
  postersAmong,
  verifyWebhook,
  type SenderMandir,
} from "@/lib/inbound-email";

const ON = {
  INBOUND_DOMAIN: "events.toran.example",
  RESEND_WEBHOOK_SECRET: "whsec_plJ3nmyCDGBKInavdOK15jsl",
  RESEND_API_KEY: "re_test",
  ANTHROPIC_API_KEY: "sk-test",
};
const site = "https://toran.example";

describe("inboundEmailOn", () => {
  it("needs the domain, the webhook secret, Resend and the poster reader", () => {
    expect(inboundEmailOn(ON)).toBe(true);
    for (const key of Object.keys(ON)) {
      expect(inboundEmailOn({ ...ON, [key]: undefined })).toBe(false);
    }
    expect(
      inboundEmailOn({ ...ON, RESEND_WEBHOOK_SECRET: "not-a-secret" }),
    ).toBe(false);
  });

  it("only takes a real domain", () => {
    expect(inboundDomain({ INBOUND_DOMAIN: " Events.Toran.Example " })).toBe(
      "events.toran.example",
    );
    expect(inboundDomain({ INBOUND_DOMAIN: "https://toran.example" })).toBe(
      null,
    );
    expect(inboundDomain({ INBOUND_DOMAIN: "toran" })).toBe(null);
  });

  it("gives each mandir its own address", () => {
    expect(forwardingAddress("shree-ram-mandir", "events.toran.example")).toBe(
      "shree-ram-mandir@events.toran.example",
    );
  });
});

describe("verifyWebhook", () => {
  // Svix's own example, which Resend's signatures follow.
  const body = '{"event_type":"ping","data":{"success":true}}';
  const headers = {
    id: "msg_loFOjxBNrRLzqYUf",
    timestamp: "1731705121",
    signature: "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=",
  };
  const at = 1731705121 * 1000;
  const secret = ON.RESEND_WEBHOOK_SECRET;

  it("accepts a signed request", () => {
    expect(verifyWebhook(body, headers, secret, at)).toBe(true);
  });

  it("accepts it among other signatures", () => {
    expect(
      verifyWebhook(
        body,
        { ...headers, signature: `v1,AAAA ${headers.signature}` },
        secret,
        at,
      ),
    ).toBe(true);
  });

  it("turns away a changed body, another secret or a missing header", () => {
    expect(
      verifyWebhook(body.replace("true", "false"), headers, secret, at),
    ).toBe(false);
    expect(verifyWebhook(body, headers, "whsec_c2VjcmV0", at)).toBe(false);
    expect(verifyWebhook(body, { ...headers, id: null }, secret, at)).toBe(
      false,
    );
    expect(
      verifyWebhook(body, { ...headers, signature: "v2,whatever" }, secret, at),
    ).toBe(false);
    expect(verifyWebhook(body, headers, "", at)).toBe(false);
  });

  it("turns away an old or future one", () => {
    expect(verifyWebhook(body, headers, secret, at + 6 * 60_000)).toBe(false);
    expect(verifyWebhook(body, headers, secret, at - 6 * 60_000)).toBe(false);
    expect(verifyWebhook(body, headers, secret, at + 4 * 60_000)).toBe(true);
  });
});

describe("addresses", () => {
  it("reads the bare address", () => {
    expect(addressOf("Asha Patel <Asha@Example.com>")).toBe("asha@example.com");
    expect(addressOf("asha@example.com")).toBe("asha@example.com");
    expect(addressOf("not an address")).toBe(null);
  });

  it("finds the mandirs it was sent to, at Toran's domain only", () => {
    expect(
      addressedSlugs(
        [
          "Toran <shree-ram-mandir@events.toran.example>",
          "SHREE-RAM-MANDIR@events.toran.example",
          "friend@example.com",
          "bad_slug@events.toran.example",
          "other@toran.example",
        ],
        "events.toran.example",
      ),
    ).toEqual(["shree-ram-mandir"]);
  });
});

describe("pickMandir", () => {
  const ram: SenderMandir = {
    id: "r",
    slug: "ram",
    name: "Ram Mandir",
    town: "Kenton",
    today: 0,
  };
  const shiv: SenderMandir = { ...ram, id: "s", slug: "shiv", name: "Shiv" };

  it("is the one it was sent to", () => {
    expect(pickMandir([ram, shiv], ["shiv"])).toEqual({ mandir: shiv });
  });

  it("is the sender's only mandir, whatever address it went to", () => {
    expect(pickMandir([ram], [])).toEqual({ mandir: ram });
    expect(pickMandir([ram], ["ram"])).toEqual({ mandir: ram });
  });

  it("asks which, when the sender has several and didn't say", () => {
    expect(pickMandir([ram, shiv], [])).toEqual({ error: "choose" });
    expect(pickMandir([ram, shiv], ["ram", "shiv"])).toEqual({
      error: "choose",
    });
  });

  it("won't read for a mandir the sender isn't on", () => {
    expect(pickMandir([], ["ram"])).toEqual({ error: "unknown" });
    expect(pickMandir([ram], ["shiv"])).toEqual({ mandir: ram });
    expect(pickMandir([ram, shiv], ["vishnu"])).toEqual({ error: "choose" });
  });

  it("stops after a day's emails", () => {
    const busy = { ...ram, today: EMAILS_PER_DAY };
    expect(pickMandir([busy], [])).toEqual({ error: "too-many", mandir: busy });
  });
});

describe("isAuthentic", () => {
  it("needs DKIM from the sender's domain or DMARC to pass", () => {
    expect(isAuthentic({ spf: "pass", dkim: "pass", dmarc: "pass" })).toBe(
      true,
    );
    expect(isAuthentic({ spf: "gray", dkim: "pass", dmarc: "gray" })).toBe(
      true,
    );
    expect(isAuthentic({ spf: "pass", dkim: "gray", dmarc: "pass" })).toBe(
      true,
    );
    expect(isAuthentic({ spf: "pass", dkim: "gray", dmarc: "gray" })).toBe(
      false,
    );
    expect(isAuthentic({ spf: "fail", dkim: "fail", dmarc: "fail" })).toBe(
      false,
    );
    expect(isAuthentic(null)).toBe(false);
    expect(isAuthentic(undefined)).toBe(false);
  });
});

describe("messageText", () => {
  it("keeps the event and drops who it was from and to", () => {
    const text = messageText(
      "Fwd: Diwali programme",
      [
        "---------- Forwarded message ---------",
        "From: Asha Patel <asha@example.com>",
        "Date: Mon, 2 Nov 2026 at 10:00",
        "Subject: Diwali programme",
        "To: <committee@example.com>",
        "",
        "> Jai Shri Krishna. Diwali Lakshmi puja on Sun 8 Nov at 6.30pm.",
        "> Call Asha on 07700 900123 or email asha@example.com",
      ].join("\n"),
      null,
    );
    expect(text).toContain("Diwali programme");
    expect(text).toContain("Diwali Lakshmi puja on Sun 8 Nov at 6.30pm.");
    expect(text).not.toContain("asha@example.com");
    expect(text).not.toContain("07700");
    expect(text).not.toMatch(/^(From|To|Date|Subject):/m);
    expect(text).not.toContain("Forwarded message");
  });

  it("reads the words of an HTML-only email", () => {
    expect(
      messageText(
        "",
        null,
        "<style>p{}</style><p>Navratri garba</p><p>Fri 9 Oct &amp; Sat 10 Oct</p>",
      ),
    ).toBe("Navratri garba\nFri 9 Oct & Sat 10 Oct");
  });
});

describe("clock", () => {
  it("shows times as the site does", () => {
    expect(clock("18:30")).toBe("6:30pm");
    expect(clock("18:00")).toBe("6pm");
    expect(clock("00:05")).toBe("12:05am");
    expect(clock("12:00")).toBe("12pm");
  });
});

describe("postersAmong", () => {
  const picture = (id: string, size: number, type = "image/jpeg") => ({
    id,
    content_type: type,
    size,
    download_url: `https://cdn.example/${id}`,
  });

  it("takes up to three posters, largest first, and no logos or other files", () => {
    expect(
      postersAmong([
        picture("logo", 4_000, "image/png"),
        picture("a", 300_000),
        picture("doc", 90_000, "application/msword"),
        picture("b", 900_000),
        picture("pdf", 20_000, "application/pdf"),
        picture("huge", 9_000_000),
        picture("c", 100_000),
      ]).map((a) => a.id),
    ).toEqual(["b", "a", "c"]);
    expect(
      postersAmong([picture("pdf", 20_000, "application/pdf")]),
    ).toHaveLength(1);
  });
});

describe("inboundReply", () => {
  const mandir = { slug: "ram", name: "Shree <Ram> Mandir" };
  const diwali: EventInput = {
    title: "Diwali & Annakut",
    date: "2026-11-08",
    time: "18:30",
    summary: "",
    repeat: "none",
    until: "",
  } as EventInput;

  it("lists what it found and links to check it", () => {
    const email = inboundReply({
      outcome: "read",
      subject: "Fwd: Diwali",
      mandir,
      events: [diwali],
      skipped: 1,
      domain: "events.toran.example",
      siteUrl: site,
    });
    expect(email.subject).toBe("Re: Fwd: Diwali");
    expect(email.html).toContain("Toran found 1 event");
    expect(email.html).toContain("Diwali &amp; Annakut");
    expect(email.html).toContain("Sunday 8 November, 6:30pm");
    expect(email.html).toContain("Shree &lt;Ram&gt; Mandir");
    expect(email.html).toContain(`${site}/manage/ram#posters`);
    expect(email.html).toContain("1 more was left out");
    expect(email.text).toContain("- Diwali & Annakut, 2026-11-08 18:30");
    expect(email.html).not.toContain("<Ram>");
  });

  it("gives each of the sender's addresses when it can't tell which", () => {
    const email = inboundReply({
      outcome: "choose",
      subject: null,
      mandirs: [mandir, { slug: "shiv", name: "Shiv Mandir" }],
      domain: "events.toran.example",
      siteUrl: site,
    });
    expect(email.subject).toBe("Your email to Toran");
    expect(email.text).toContain("Shiv Mandir: shiv@events.toran.example");
    expect(email.html).toContain("ram@events.toran.example");
  });

  it("explains a stranger's address, a failure and a busy day", () => {
    const base = { subject: "Poster", domain: "x.example", siteUrl: site };
    expect(inboundReply({ ...base, outcome: "unknown" }).html).toContain(
      "Toran doesn&#39;t know this address",
    );
    expect(inboundReply({ ...base, outcome: "failed", mandir }).html).toContain(
      `${site}/manage/ram#add`,
    );
    expect(
      inboundReply({ ...base, outcome: "too-many", mandir }).text,
    ).toContain(`up to ${EMAILS_PER_DAY} emails a day`);
    expect(
      inboundReply({ ...base, outcome: "nothing", mandir }).html,
    ).toContain("couldn&#39;t find any new events");
  });
});

describe("handleInboundEmail", () => {
  const event: EventInput = {
    title: "Diwali",
    date: "2026-11-08",
    time: "18:30",
    summary: "",
    repeat: "none",
    until: "",
  } as EventInput;
  const mandir = {
    id: "m1",
    slug: "ram",
    name: "Ram Mandir",
    town: "Kenton",
    today: 0,
  };

  function setup({
    email = {},
    mandirs = [mandir],
    attachments = [] as unknown[],
  }: {
    email?: Record<string, unknown>;
    mandirs?: SenderMandir[];
    attachments?: unknown[];
  } = {}) {
    const updates: Record<string, unknown>[] = [];
    const db = {
      from: () => ({
        update: (values: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(values);
            return { error: null };
          },
        }),
      }),
      rpc: vi.fn(async () => ({ data: mandirs, error: null })),
    };
    const received = {
      from: "Asha <asha@example.com>",
      to: ["ram@events.toran.example"],
      subject: "Fwd: Diwali",
      text: "Diwali Lakshmi puja, Sunday 8 November at 6.30pm",
      html: null,
      message_id: "<abc@example.com>",
      authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
      ...email,
    };
    const send = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("/attachments?limit=100")) {
        return Response.json({ data: attachments });
      }
      if (href.startsWith("https://api.resend.com/emails/receiving/")) {
        return Response.json(received);
      }
      return new Response(new Uint8Array(200_000));
    }) as unknown as typeof fetch;
    const reply = vi.fn(async () => true);
    const readPicture = vi.fn(async () => ({
      ok: true as const,
      events: [event],
    }));
    const readWords = vi.fn(async () => ({
      ok: true as const,
      events: [event],
    }));
    const queue = vi.fn(
      async (_db: unknown, _m: string, _f: string, events: EventInput[]) => ({
        added: events.length,
        skipped: 0,
        queued: events,
      }),
    );
    const run = () =>
      handleInboundEmail(db as never, "em_1", {
        env: ON,
        send,
        siteUrl: site,
        now: new Date("2026-11-02T10:00:00Z"),
        readPicture,
        readWords,
        queue,
        reply,
      });
    return { run, db, updates, reply, readPicture, readWords, queue };
  }

  it("reads the words, queues the events and replies to the sender", async () => {
    const t = setup();
    expect(await t.run()).toEqual({ outcome: "read", events: 1 });
    expect(t.db.rpc).toHaveBeenCalledWith("inbound_sender_mandirs", {
      sender: "asha@example.com",
    });
    expect(t.readWords).toHaveBeenCalledWith(
      expect.stringContaining("Diwali Lakshmi puja"),
      { mandir: "Ram Mandir, Kenton", today: "2026-11-02" },
    );
    expect(t.readPicture).not.toHaveBeenCalled();
    expect(t.queue).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
      "email",
      [event],
      "",
    );
    expect(t.reply).toHaveBeenCalledTimes(1);
    const [to, email] = t.reply.mock.calls[0] as unknown as [
      string,
      { subject: string; headers: Record<string, string> },
    ];
    expect(to).toBe("asha@example.com");
    expect(email.subject).toBe("Re: Fwd: Diwali");
    expect(email.headers["In-Reply-To"]).toBe("<abc@example.com>");
    expect(t.updates.at(-1)).toEqual({
      outcome: "read",
      mandir_id: "m1",
      events: 1,
    });
  });

  it("reads an attached poster instead of a short covering note", async () => {
    const t = setup({
      email: { text: "See attached" },
      attachments: [
        {
          id: "a1",
          content_type: "image/jpeg",
          size: 200_000,
          download_url: "https://cdn.example/a1",
        },
      ],
    });
    expect(await t.run()).toEqual({ outcome: "read", events: 1 });
    expect(t.readPicture).toHaveBeenCalledTimes(1);
    expect(t.readWords).not.toHaveBeenCalled();
  });

  it("doesn't read or answer a forged email", async () => {
    const t = setup({
      email: { authentication: { spf: "fail", dkim: "gray", dmarc: "fail" } },
    });
    expect(await t.run()).toEqual({ outcome: "unverified", events: 0 });
    expect(t.db.rpc).not.toHaveBeenCalled();
    expect(t.reply).not.toHaveBeenCalled();
    expect(t.readWords).not.toHaveBeenCalled();
  });

  it("tells someone not on a committee, without reading it", async () => {
    const t = setup({ mandirs: [] });
    expect(await t.run()).toEqual({ outcome: "unknown", events: 0 });
    expect(t.readWords).not.toHaveBeenCalled();
    expect(t.reply).toHaveBeenCalledTimes(1);
  });

  it("says when nothing new was found", async () => {
    const t = setup();
    t.readWords.mockResolvedValueOnce({ ok: true, events: [] });
    expect(await t.run()).toEqual({ outcome: "nothing", events: 0 });
    expect(t.queue).not.toHaveBeenCalled();
  });

  it("says when reading failed", async () => {
    const t = setup();
    t.readWords.mockResolvedValueOnce({ ok: false, error: "failed" } as never);
    expect(await t.run()).toEqual({ outcome: "failed", events: 0 });
    expect(t.updates.at(-1)).toMatchObject({
      outcome: "failed",
      mandir_id: "m1",
    });
  });
});

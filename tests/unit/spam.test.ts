import { describe, expect, it } from "vitest";
import { linkCount, SendLimiter, senderAddress, spamCheck } from "@/lib/spam";

describe("what's written in a public form", () => {
  it("lets ordinary messages through, in English or Gujarati", () => {
    expect(spamCheck(["Diwali fireworks", "Starts 7pm, prasad after"])).toBe(
      "ok",
    );
    expect(spamCheck(["દિવાળી ઉત્સવ", "સાંજે 7 વાગ્યે"])).toBe("ok");
    expect(
      spamCheck(["The times are on https://example-mandir.org.uk/diwali"]),
    ).toBe("ok");
  });

  it("asks for fewer links when there are more than two", () => {
    expect(linkCount("see https://a.org and http://b.org or www.c.co.uk")).toBe(
      3,
    );
    expect(spamCheck(["https://a.org", "http://b.org and www.c.co.uk"])).toBe(
      "links",
    );
  });

  it("quietly drops link markup and spam words", () => {
    expect(spamCheck(['<a href="https://x.example">cheap</a>'])).toBe("junk");
    expect(spamCheck(["[url=https://x.example]cheap[/url]"])).toBe("junk");
    expect(spamCheck(["Best CASINO bonus"])).toBe("junk");
    expect(spamCheck(["We sell backlinks"])).toBe("junk");
    // Whole words only.
    expect(spamCheck(["Sports day at Escorte Hall"])).toBe("ok");
  });
});

describe("how often one place can send", () => {
  it("allows five sends in ten minutes, then waits", () => {
    const limiter = new SendLimiter();
    const start = Date.parse("2026-10-26T10:00:00Z");
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow("report", "203.0.113.7", start + i * 1000)).toBe(
        true,
      );
    }
    expect(limiter.allow("report", "203.0.113.7", start + 6000)).toBe(false);
    // Someone else, or the other form, is counted separately.
    expect(limiter.allow("report", "203.0.113.8", start + 6000)).toBe(true);
    expect(limiter.allow("correction", "203.0.113.7", start + 6000)).toBe(true);
    // Ten minutes after the first, there's room again.
    expect(limiter.allow("report", "203.0.113.7", start + 600_001)).toBe(true);
  });

  it("never turns anyone away when it can't tell where they are", () => {
    const limiter = new SendLimiter(1);
    expect(limiter.allow("report", null)).toBe(true);
    expect(limiter.allow("report", null)).toBe(true);
  });

  it("reads the address the hosting platform passes on", () => {
    expect(
      senderAddress(
        new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.7");
    expect(senderAddress(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
    expect(senderAddress(new Headers())).toBeNull();
    for (const local of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      expect(
        senderAddress(new Headers({ "x-forwarded-for": local })),
      ).toBeNull();
    }
  });
});

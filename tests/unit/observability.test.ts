import { describe, expect, it } from "vitest";
import { scrubEmails, scrubEvent } from "@/lib/observability";

describe("scrubEmails", () => {
  it("removes email addresses", () => {
    expect(scrubEmails("login failed for secretary@mandir.org.uk at 8pm")).toBe(
      "login failed for [email removed] at 8pm",
    );
    expect(scrubEmails("a@b.co and c.d+e@f.org.uk")).toBe(
      "[email removed] and [email removed]",
    );
  });

  it("leaves other text alone", () => {
    expect(scrubEmails("Navratri night 3 @ 8pm")).toBe(
      "Navratri night 3 @ 8pm",
    );
  });
});

describe("scrubEvent", () => {
  it("strips people, cookies and headers from a Sentry event", () => {
    const event = scrubEvent({
      message: "for x@y.com",
      exception: { values: [{ value: "bad email z@w.org" }] },
      request: {
        cookies: { sb: "secret" },
        headers: { a: "b" },
        query_string: "email=x@y.com",
      },
      user: { email: "x@y.com" },
    });
    expect(event).toEqual({
      message: "for [email removed]",
      exception: { values: [{ value: "bad email [email removed]" }] },
      request: {},
    });
  });
});

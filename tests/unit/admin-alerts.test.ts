import { describe, expect, it, vi } from "vitest";
import {
  alertAdmins,
  alertRecipients,
  claimAlertEmail,
} from "@/lib/admin-alerts";

describe("alertRecipients", () => {
  it("reads one address or several, tidied", () => {
    expect(
      alertRecipients({
        ADMIN_ALERTS_TO: " A@example.com, b@example.org ,a@example.com",
      }),
    ).toEqual(["a@example.com", "b@example.org"]);
  });

  it("skips anything that isn't an address, and is empty when unset", () => {
    expect(alertRecipients({ ADMIN_ALERTS_TO: "nobody, @x, y@z" })).toEqual([]);
    expect(alertRecipients({})).toEqual([]);
  });
});

describe("claimAlertEmail", () => {
  const email = claimAlertEmail(
    { name: "Shree <Ram> Mandir", town: "Kenton" },
    "https://toran.example",
  );

  it("says which mandir and links to the claims to check", () => {
    expect(email.subject).toBe(
      "Someone wants to look after Shree <Ram> Mandir on Toran",
    );
    expect(email.text).toContain("Shree <Ram> Mandir, Kenton");
    expect(email.text).toContain("https://toran.example/ops#claims");
    expect(email.html).toContain("Shree &lt;Ram&gt; Mandir, Kenton");
  });

  it("doesn't say who asked", () => {
    expect(email.text).toContain("Who asked is in the admin area");
  });
});

describe("alertAdmins", () => {
  const env = {
    RESEND_API_KEY: "re_test",
    DIGEST_FROM: "Toran <hello@toran.example>",
    ADMIN_ALERTS_TO: "a@example.com, b@example.com",
  };
  const email = claimAlertEmail(
    { name: "Mandir", town: "Leicester" },
    "https://toran.example",
  );

  it("emails each admin address through Resend", async () => {
    const to: unknown[] = [];
    const send = vi.fn(async (_url: unknown, init?: RequestInit) => {
      to.push(JSON.parse(String(init?.body)).to);
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;
    expect(await alertAdmins(email, env, send)).toBe(2);
    const bodies = to;
    expect(bodies).toEqual([["a@example.com"], ["b@example.com"]]);
  });

  it("sends nothing without the sender set up", async () => {
    const send = vi.fn();
    expect(
      await alertAdmins(email, { ADMIN_ALERTS_TO: "a@example.com" }, send),
    ).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});

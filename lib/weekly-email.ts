import { createHash, createHmac, randomBytes } from "node:crypto";
import { REGIONS } from "@/lib/mandir-form";

// The weekly "What's on" email: sign-up, confirming and leaving, and the
// email itself around the digest (lib/digest.ts). Off until Toran is
// registered with the ICO and has a DPIA (decision 0006): nothing here
// runs unless DIGEST_SIGNUPS is "on", and nothing is sent without an
// email sender's key (lib/mailer.ts).

export function weeklyEmailOn(
  setting: string | undefined = process.env.DIGEST_SIGNUPS,
): boolean {
  return setting === "on";
}

// A simple, generous check: something@somewhere.something, no spaces.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type Signup =
  | { ok: true; email: string; region: string | null }
  | { ok: false; error: "email" | "region" };

export function checkSignup(email: string, region: string): Signup {
  const address = email.trim().toLowerCase();
  if (address.length < 6 || address.length > 254 || !EMAIL.test(address)) {
    return { ok: false, error: "email" };
  }
  const area = region.trim();
  if (area && !(REGIONS as readonly string[]).includes(area)) {
    return { ok: false, error: "region" };
  }
  return { ok: true, email: address, region: area || null };
}

// The secret codes in the confirm and unsubscribe links. Only their
// hashes are stored, so the list itself can't be used to leave for
// someone else.
export function newCode(): string {
  return randomBytes(24).toString("base64url");
}

// The unsubscribe code is the same in every email to one address: worked
// out from the address with a secret only the site knows (CRON_SECRET),
// so it needn't be stored, and the list can't be used to make one.
export function leaveCode(
  email: string,
  secret: string | undefined = process.env.CRON_SECRET,
): string | null {
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`leave:${email.trim().toLowerCase()}`)
    .digest()
    .subarray(0, 24)
    .toString("base64url");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function isCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
}

export function confirmUrl(site: string, code: string): string {
  return `${site}/weekly/confirm?code=${code}`;
}

export function leaveUrl(site: string, code: string): string {
  return `${site}/weekly/leave?code=${code}`;
}

// For email programs' own "Unsubscribe" button, which sends a POST.
export function leaveNowUrl(site: string, code: string): string {
  return `${site}/api/weekly/leave?code=${code}`;
}

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export type Email = {
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

const FONT =
  "font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1a2c";

// "Please confirm": the only email sent before someone has said yes.
export function confirmEmail(
  site: string,
  code: string,
  region: string | null,
): Email {
  const link = confirmUrl(site, code);
  const where = region ? `in ${region}` : "across the UK";
  return {
    subject: "Please confirm: What's on at mandirs, every week",
    text: [
      `Someone asked for Toran's weekly email of what's on at mandirs ${where}, at this address.`,
      `If that was you, confirm here:\n${link}`,
      "If it wasn't, ignore this email: nothing will be sent, and the address is deleted after a week.",
    ].join("\n\n"),
    html: [
      `<div style="${FONT}">`,
      `<p>Someone asked for Toran's weekly email of what's on at mandirs ${escape(where)}, at this address.</p>`,
      `<p><a href="${escape(link)}" style="color:#0b6b68;font-weight:bold">Yes, send me the weekly email</a></p>`,
      "<p>If it wasn't you, ignore this email: nothing will be sent, and the address is deleted after a week.</p>",
      "</div>",
    ].join("\n"),
  };
}

// The weekly email: the digest, with a way to leave in every one, in the
// text, in the HTML and in the headers email programs use for their own
// "Unsubscribe" button.
export function weeklyEmail(
  digest: { subject: string; text: string; html: string },
  site: string,
  leaveCode: string,
): Email {
  const leave = leaveUrl(site, leaveCode);
  return {
    subject: digest.subject,
    text: `${digest.text}\n\n—\nYou asked for this email on Toran. To stop it: ${leave}`,
    html: `${digest.html}\n<p style="${FONT};font-size:14px;color:#5b5a6e;margin-top:24px">You asked for this email on Toran. <a href="${escape(leave)}" style="color:#0b6b68">Stop these emails</a>.</p>`,
    headers: {
      "List-Unsubscribe": `<${leaveNowUrl(site, leaveCode)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

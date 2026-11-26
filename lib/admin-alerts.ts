import { sendEmail } from "@/lib/mailer";
import type { Email } from "@/lib/weekly-email";

// Emails to Toran's admins when something is waiting for them: for now,
// someone asking to look after a mandir's page (a claim), which an admin
// checks with the mandir before approving. Sent to ADMIN_ALERTS_TO (one
// address, or several separated by commas), through the same Resend
// sender as the weekly email (lib/mailer.ts); without those set, nothing
// is sent and the claim still waits on /ops as before.
//
// The email says which mandir, not who: being on a mandir's committee can
// show someone's religion (DPIA section 5), so the person's details stay
// in the admin area, behind the login and second factor.

const ADDRESS = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function alertRecipients(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return [
    ...new Set(
      String(env.ADMIN_ALERTS_TO ?? "")
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter((a) => ADDRESS.test(a)),
    ),
  ].slice(0, 5);
}

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const FONT =
  "font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1a2c";

export function claimAlertEmail(
  mandir: { name: string; town: string },
  site: string,
): Email {
  const where = `${mandir.name}, ${mandir.town}`;
  const link = `${site}/ops#claims`;
  return {
    subject: `Someone wants to look after ${mandir.name} on Toran`,
    text: [
      `Someone has asked to look after ${where} on Toran.`,
      `Check with the mandir, then approve or turn it down in the admin area:\n${link}`,
      "Who asked is in the admin area, not in this email.",
    ].join("\n\n"),
    html: [
      `<div style="${FONT}">`,
      `<p>Someone has asked to look after <strong>${escape(where)}</strong> on Toran.</p>`,
      `<p>Check with the mandir, then approve or turn it down in the admin area.</p>`,
      `<p><a href="${escape(link)}" style="color:#0b6b68;font-weight:bold">Open the claims to check</a></p>`,
      `<p style="color:#5b5a6e;font-size:14px">Who asked is in the admin area, not in this email.</p>`,
      "</div>",
    ].join("\n"),
  };
}

// A committee asked for help connecting its website (decision 0032):
// which mandir, not who asked.
export function websiteHelpEmail(
  mandir: { name: string; town: string },
  site: string,
  slug: string,
): Email {
  const where = `${mandir.name}, ${mandir.town}`;
  const link = `${site}/ops/mandirs/${slug}`;
  return {
    subject: `${mandir.name} would like help connecting their website`,
    text: [
      `The committee of ${where} pressed "Ask Toran to help" for connecting their website: Toran couldn't read events from it by itself.`,
      `Their page in the admin area:\n${link}`,
    ].join("\n\n"),
    html: [
      `<div style="${FONT}">`,
      `<p>The committee of <strong>${escape(where)}</strong> pressed &ldquo;Ask Toran to help&rdquo; for connecting their website: Toran couldn't read events from it by itself.</p>`,
      `<p><a href="${escape(link)}" style="color:#0b6b68;font-weight:bold">Open their page in the admin area</a></p>`,
      "</div>",
    ].join("\n"),
  };
}

// Sends it to each admin address; never fails loudly (the claim is saved
// either way, and shows on /ops).
export async function alertAdmins(
  email: Email,
  env: Record<string, string | undefined> = process.env,
  send: typeof fetch = fetch,
): Promise<number> {
  let sent = 0;
  for (const to of alertRecipients(env)) {
    if (await sendEmail(to, email, env, send)) sent += 1;
  }
  return sent;
}

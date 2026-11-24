// A family's request to a mandir's committee (decision 0025): a puja, a
// ceremony or hall hire, emailed to the committee, not kept by Toran.
// Checking the form and writing the email; pure, so tested on its own.

import type { Email } from "@/lib/weekly-email";

export type MandirRequest = {
  what: string;
  date: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function checkRequest(
  form: FormData,
  offered: readonly string[],
  today: string,
): { ok: true; request: MandirRequest } | { ok: false; error: string } {
  const text = (k: string) =>
    String(form.get(k) ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const what = text("what");
  if (!offered.includes(what)) return { ok: false, error: "what" };
  const date = text("date") || null;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today)) {
    return { ok: false, error: "date" };
  }
  const name = text("name");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "name" };
  const email = text("email").toLowerCase() || null;
  if (email && (email.length > 254 || !EMAIL.test(email))) {
    return { ok: false, error: "email" };
  }
  const phone = text("phone") || null;
  if (phone && !/^[0-9+() -]{6,40}$/.test(phone)) {
    return { ok: false, error: "phone" };
  }
  if (!email && !phone) return { ok: false, error: "contact" };
  const message = String(form.get("message") ?? "").trim();
  if (message.length > 600) return { ok: false, error: "message" };
  return { ok: true, request: { what, date, name, email, phone, message } };
}

const escape = (t: string) =>
  t
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function requestEmail(
  mandir: { name: string },
  r: MandirRequest,
  when: string | null,
): Email {
  const lines = [
    `A family has asked ${mandir.name} about: ${r.what}${when ? `, on ${when}` : ""}.`,
    "",
    `From: ${r.name}`,
    ...(r.email ? [`Email: ${r.email}`] : []),
    ...(r.phone ? [`Phone: ${r.phone}`] : []),
    ...(r.message ? ["", r.message] : []),
    "",
    r.email
      ? "Reply to this email to answer them."
      : "Please call or message them on the number above.",
    "",
    "Sent through your page on Toran, which hasn't kept a copy. Your committee members on Toran all get this email.",
  ];
  const text = lines.join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1a2c">${text
    .split("\n\n")
    .map((p) => `<p>${escape(p).replaceAll("\n", "<br>")}</p>`)
    .join("")}</div>`;
  return {
    subject: `Request: ${r.what}${when ? `, ${when}` : ""} (${mandir.name})`,
    text,
    html,
    ...(r.email && { replyTo: r.email }),
  };
}

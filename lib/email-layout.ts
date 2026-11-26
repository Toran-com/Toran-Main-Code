// Toran's look for the emails it sends committees (DESIGN.md, "Midnight &
// Gold"): a midnight band with the gold wordmark, a white card on stone,
// lapis buttons. Email programs ignore stylesheets and web fonts in many
// places, so everything is tables with inline styles, the fonts fall back
// to ones every phone has, and the layout is one column 600px wide that
// shrinks on a phone. Pure, so each email's HTML is tested on its own.

export const EMAIL_COLOURS = {
  stone: "#f6f4ef",
  surface: "#ffffff",
  sunk: "#eeebe4",
  ink: "#1a1a22",
  muted: "#55566a",
  line: "#dedbd3",
  lapis: "#1f3a8a",
  night: "#14213d",
  onNight: "#f6f4ef",
  nightMuted: "#c9ccda",
  gold: "#d9a441",
  goldInk: "#7a5a12",
  tile: "#eef0f7",
  leafInk: "#2f6a2b",
  leafTint: "#e9f2e7",
} as const;

const C = EMAIL_COLOURS;

// Mulish and Marcellus where the email program has them; otherwise the
// phone's own.
export const BODY_FONT = "Mulish,'Helvetica Neue',Helvetica,Arial,sans-serif";
export const HEADING_FONT = "Marcellus,Georgia,'Times New Roman',serif";

export const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// A button that works in every email program, Outlook included: a table
// cell with the colour, and the link filling it.
export function emailButton(
  href: string,
  label: string,
  tone: "lapis" | "gold" | "outline" = "lapis",
): string {
  const fill =
    tone === "gold" ? C.gold : tone === "outline" ? C.surface : C.lapis;
  const text =
    tone === "gold" ? C.night : tone === "outline" ? C.lapis : "#ffffff";
  const border = tone === "outline" ? C.lapis : fill;
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;display:inline-table;margin:4px 8px 4px 0">`,
    `<tr><td bgcolor="${fill}" style="background:${fill};border:2px solid ${border};border-radius:999px">`,
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${BODY_FONT};font-size:17px;font-weight:700;line-height:1.2;color:${text};text-decoration:none;white-space:nowrap;border-radius:999px">${escapeHtml(label)}</a>`,
    `</td></tr></table>`,
  ].join("");
}

// A paragraph of body text. `html` is trusted (built here); plain text
// goes through escapeHtml first.
export function emailParagraph(
  html: string,
  { muted = false, size = 17 }: { muted?: boolean; size?: number } = {},
): string {
  return `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:${size}px;line-height:1.55;color:${muted ? C.muted : C.ink}">${html}</p>`;
}

export function emailHeading(text: string, size = 26): string {
  return `<h2 style="margin:0 0 12px;font-family:${HEADING_FONT};font-weight:400;font-size:${size}px;line-height:1.2;color:${C.ink}">${escapeHtml(text)}</h2>`;
}

export function emailLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${C.lapis};font-weight:700;text-decoration:underline">${escapeHtml(label)}</a>`;
}

// The whole email: the midnight band (wordmark, a small gold line above
// the heading, the heading and a line under it), then the card with the
// blocks, then the small print. The preheader is the line email programs
// show after the subject in the inbox.
export function emailLayout({
  preheader,
  eyebrow,
  heading,
  lead,
  blocks,
  footer,
}: {
  preheader: string;
  eyebrow?: string;
  heading: string;
  lead?: string;
  blocks: string[];
  footer: string[];
}): string {
  const band = [
    `<tr><td bgcolor="${C.night}" style="background:${C.night};padding:28px 32px 32px;border-radius:20px 20px 0 0">`,
    `<p style="margin:0 0 22px;font-family:${HEADING_FONT};font-size:15px;letter-spacing:0.16em;text-transform:uppercase;color:${C.gold}">Toran</p>`,
    eyebrow
      ? `<p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:15px;font-weight:700;letter-spacing:0.04em;color:${C.gold}">${escapeHtml(eyebrow)}</p>`
      : "",
    `<h1 style="margin:0;font-family:${HEADING_FONT};font-weight:400;font-size:30px;line-height:1.2;color:${C.onNight}">${escapeHtml(heading)}</h1>`,
    lead
      ? `<p style="margin:12px 0 0;font-family:${BODY_FONT};font-size:17px;line-height:1.5;color:${C.nightMuted}">${escapeHtml(lead)}</p>`
      : "",
    `</td></tr>`,
  ].join("");
  const card = `<tr><td bgcolor="${C.surface}" style="background:${C.surface};padding:28px 32px 12px;border-radius:0 0 20px 20px">${blocks.join("\n")}</td></tr>`;
  const small = `<tr><td style="padding:20px 32px 8px">${footer
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${C.muted}">${line}</p>`,
    )
    .join("")}</td></tr>`;
  return [
    "<!doctype html>",
    `<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeHtml(heading)}</title></head>`,
    `<body style="margin:0;padding:0;background:${C.stone}">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.stone}">${escapeHtml(preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.stone}" style="background:${C.stone}"><tr><td align="center" style="padding:24px 12px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:separate">`,
    band,
    card,
    small,
    "</table></td></tr></table></body></html>",
  ].join("\n");
}

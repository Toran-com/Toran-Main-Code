import type { SupabaseClient } from "@supabase/supabase-js";
import {
  committeeEmailOn,
  stopCode,
  stopUrl,
  unsubscribeHeaders,
} from "@/lib/committee-email";
import type { Database } from "@/lib/database.types";
import {
  EMAIL_COLOURS as C,
  BODY_FONT,
  HEADING_FONT,
  emailButton,
  emailLayout,
  emailLink,
  emailParagraph,
  escapeHtml,
} from "@/lib/email-layout";
import { formatEventStart } from "@/lib/format";
import { mailerReady, sendEmail } from "@/lib/mailer";
import { sevaPagePath, whatsAppLink } from "@/lib/share";
import { shiftLabel } from "@/lib/seva";
import type { Email } from "@/lib/weekly-email";

// The seva emails to a mandir's committee (decision 0029):
//
// - each evening, a roundup of the places taken on Toran since the last
//   one, with how each seva now stands (one email, however many places);
// - straight away, when every place still to come in a seva is taken.
//
// Seva places are anonymous (decision 0013), so the emails only count.
// Sent to each committee member who hasn't stopped them, only while
// committee emails are on (COMMITTEE_EMAIL, decision 0023).

export function sevaEmailOn(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return committeeEmailOn(env.COMMITTEE_EMAIL) && mailerReady(env);
}

export type SevaShift = {
  starts_at: string;
  ends_at: string;
  needed: number;
  taken: number;
};

export type SevaSummary = {
  id: string;
  name: string;
  event: {
    id: string;
    title: string;
    starts_at: string;
    all_day: boolean;
  } | null;
  // Its times still to come.
  shifts: SevaShift[];
  // Places taken on Toran since the last roundup (roundups only).
  new?: number;
};

type Mandir = { id: string; slug: string; name: string; town: string };
type Recipient = { user_id: string; email: string };

// Times shown for each seva; the rest are counted.
const SHOWN_SHIFTS = 6;
// Sevas shown in a roundup; the rest are counted.
const SHOWN_SEVA = 8;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const isFull = (s: SevaSummary) =>
  s.shifts.length > 0 && s.shifts.every((sh) => sh.taken >= sh.needed);

// One time's bar: how many of its places are taken, lapis while it still
// needs people and green once full. A table, so every email program draws it.
function shiftBar(shift: SevaShift): string {
  const full = shift.taken >= shift.needed;
  const pct = Math.round(
    (Math.min(shift.taken, shift.needed) / Math.max(shift.needed, 1)) * 100,
  );
  const fill = full ? C.leafInk : C.lapis;
  const bar =
    pct <= 0
      ? `<td height="10" bgcolor="${C.sunk}" style="background:${C.sunk};border-radius:999px;font-size:0;line-height:0">&nbsp;</td>`
      : pct >= 100
        ? `<td height="10" bgcolor="${fill}" style="background:${fill};border-radius:999px;font-size:0;line-height:0">&nbsp;</td>`
        : `<td width="${pct}%" height="10" bgcolor="${fill}" style="background:${fill};border-radius:999px 0 0 999px;font-size:0;line-height:0">&nbsp;</td><td height="10" bgcolor="${C.sunk}" style="background:${C.sunk};border-radius:0 999px 999px 0;font-size:0;line-height:0">&nbsp;</td>`;
  return [
    `<tr><td style="padding:10px 0 0">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`,
    `<td style="font-family:${BODY_FONT};font-size:16px;color:${C.ink}">${escapeHtml(shiftLabel(shift.starts_at, shift.ends_at))}</td>`,
    `<td align="right" style="font-family:${BODY_FONT};font-size:16px;font-weight:700;color:${full ? C.leafInk : C.ink};white-space:nowrap">${full ? "&#10003; Full" : `${shift.taken} of ${shift.needed}`}</td>`,
    `</tr></table>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border-collapse:separate"><tr>${bar}</tr></table>`,
    `</td></tr>`,
  ].join("");
}

function sevaCard(seva: SevaSummary): string {
  const shown = seva.shifts.slice(0, SHOWN_SHIFTS);
  const more = seva.shifts.length - shown.length;
  const forWhat = seva.event
    ? `For ${seva.event.title}, ${formatEventStart(seva.event.starts_at, seva.event.all_day)}`
    : "Seva on its own";
  const badge = seva.new
    ? `<td align="right" valign="top" style="padding-left:12px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${C.gold};font-family:${BODY_FONT};font-size:15px;font-weight:700;color:${C.night};white-space:nowrap">+${seva.new} today</span></td>`
    : "";
  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid ${C.line};border-radius:18px;border-collapse:separate">`,
    `<tr><td style="padding:18px 20px 20px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">`,
    `<p style="margin:0 0 2px;font-family:${HEADING_FONT};font-size:22px;line-height:1.25;color:${C.ink}">${escapeHtml(seva.name)}</p>`,
    `<p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.4;color:${C.muted}">${escapeHtml(forWhat)}</p>`,
    `</td>${badge}</tr></table>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    shown.map(shiftBar).join(""),
    `</table>`,
    more > 0
      ? `<p style="margin:10px 0 0;font-family:${BODY_FONT};font-size:15px;color:${C.muted}">And ${plural(more, "more time", "more times")}.</p>`
      : "",
    `</td></tr></table>`,
  ].join("");
}

function sevaText(seva: SevaSummary): string[] {
  return [
    `${seva.name}${seva.new ? ` (+${seva.new} today)` : ""}`,
    seva.event
      ? `For ${seva.event.title}, ${formatEventStart(seva.event.starts_at, seva.event.all_day)}`
      : "Seva on its own",
    ...seva.shifts
      .slice(0, SHOWN_SHIFTS)
      .map(
        (s) =>
          `- ${shiftLabel(s.starts_at, s.ends_at)}: ${s.taken >= s.needed ? "full" : `${s.taken} of ${s.needed} places taken`}`,
      ),
    "",
  ];
}

function footer(mandirName: string, stop: string | null): string[] {
  return [
    `You get the seva emails because you help run ${escapeHtml(mandirName)}'s page on Toran. People who take seva places don't give their names, so these only count.`,
    stop
      ? `${emailLink(stop, "Stop the seva emails")}`
      : "To stop them: (a link just for each committee member)",
  ];
}

// The evening roundup.
export function sevaRoundupEmail({
  mandir,
  seva,
  siteUrl,
  stopLink,
}: {
  mandir: Mandir;
  seva: SevaSummary[];
  siteUrl: string;
  stopLink?: string;
}): Email {
  const places = seva.reduce((n, s) => n + (s.new ?? 0), 0);
  const shown = seva.slice(0, SHOWN_SEVA);
  const more = seva.length - shown.length;
  const manage = `${siteUrl}/manage/${mandir.slug}/seva`;
  // The first seva still short of people, to ask for more on WhatsApp.
  const short = seva.find((s) => !isFull(s) && s.shifts.length);
  const ask = short
    ? whatsAppLink(
        `We still need help with ${short.name} at ${mandir.name}. Take a place on Toran, no sign-up needed 🙏`,
        `${siteUrl}${sevaPagePath(mandir.slug, { id: short.id, event_id: short.event?.id ?? null })}`,
      )
    : null;
  const subject = `${plural(places, "seva place", "seva places")} taken at ${mandir.name}`;
  const heading = `${plural(places, "seva place", "seva places")} taken today`;
  const lead =
    "Volunteers took them on Toran since yesterday evening. Here's how each seva stands now.";

  const html = emailLayout({
    preheader: `${shown.map((s) => s.name).join(", ")}: how each seva stands now.`,
    eyebrow: mandir.name,
    heading,
    lead,
    blocks: [
      ...shown.map(sevaCard),
      more > 0
        ? emailParagraph(
            `And ${plural(more, "more seva", "more sevas")}: ${emailLink(manage, "see them all")}.`,
          )
        : "",
      `<p style="margin:4px 0 20px">${[
        ask ? emailButton(ask, "Ask for more on WhatsApp") : "",
        emailButton(manage, "Open your seva page", ask ? "outline" : "lapis"),
      ].join("")}</p>`,
    ],
    footer: footer(mandir.name, stopLink ?? null),
  });

  const text = [
    "Namaste,",
    "",
    `${heading} at ${mandir.name}. ${lead}`,
    "",
    ...shown.flatMap(sevaText),
    ...(more > 0
      ? [`And ${plural(more, "more seva", "more sevas")}.`, ""]
      : []),
    ...(ask ? [`Ask for more on WhatsApp: ${ask}`, ""] : []),
    `Your seva page: ${manage}`,
    "",
    "With thanks,",
    "Toran",
    "",
    `You get the seva emails because you help run ${mandir.name}'s page on Toran.`,
    `To stop them: ${stopLink ?? "(a link just for each committee member)"}`,
  ].join("\n");

  return { subject, text, html };
}

// The moment a seva's places are all taken.
export function sevaFullEmail({
  mandir,
  seva,
  siteUrl,
  stopLink,
}: {
  mandir: Mandir;
  seva: SevaSummary;
  siteUrl: string;
  stopLink?: string;
}): Email {
  const manage = `${siteUrl}/manage/${mandir.slug}/seva`;
  const subject = `Seva full: ${seva.name}${seva.event ? `, for ${seva.event.title}` : ""}`;
  const heading = "Every place is taken";
  const lead =
    "Every place still to come is taken. Thank you to everyone who took one.";
  const tip =
    "Need more people? Add places or another time on your seva page, and Toran opens it again.";
  const html = emailLayout({
    preheader: `${seva.name} at ${mandir.name} is full.`,
    eyebrow: mandir.name,
    heading,
    lead,
    blocks: [
      sevaCard(seva),
      emailParagraph(escapeHtml(tip), { muted: true, size: 16 }),
      `<p style="margin:4px 0 20px">${emailButton(manage, "Open your seva page")}</p>`,
    ],
    footer: footer(mandir.name, stopLink ?? null),
  });
  const text = [
    "Namaste,",
    "",
    `${seva.name} at ${mandir.name}: every place is taken. ${lead}`,
    "",
    ...sevaText(seva),
    tip,
    "",
    `Your seva page: ${manage}`,
    "",
    "With thanks,",
    "Toran",
    "",
    `You get the seva emails because you help run ${mandir.name}'s page on Toran.`,
    `To stop them: ${stopLink ?? "(a link just for each committee member)"}`,
  ].join("\n");
  return { subject, text, html };
}

// What the database answered, ignoring anything malformed.
export function readSeva(value: unknown): SevaSummary | null {
  const v = value as Partial<SevaSummary> | null;
  if (!v || typeof v.id !== "string" || typeof v.name !== "string") {
    return null;
  }
  const e = v.event as Partial<NonNullable<SevaSummary["event"]>> | null;
  return {
    id: v.id,
    name: v.name,
    event:
      e && typeof e.id === "string" && typeof e.starts_at === "string"
        ? {
            id: e.id,
            title: String(e.title ?? ""),
            starts_at: e.starts_at,
            all_day: Boolean(e.all_day),
          }
        : null,
    shifts: Array.isArray(v.shifts)
      ? v.shifts.flatMap((s) =>
          s && typeof s.starts_at === "string" && typeof s.ends_at === "string"
            ? [
                {
                  starts_at: s.starts_at,
                  ends_at: s.ends_at,
                  needed: Math.max(0, Number(s.needed) || 0),
                  taken: Math.max(0, Number(s.taken) || 0),
                },
              ]
            : [],
        )
      : [],
    ...(v.new !== undefined && { new: Math.max(0, Number(v.new) || 0) }),
  };
}

function readMandir(value: unknown): Mandir | null {
  const m = value as Partial<Mandir> | null;
  return m && typeof m.id === "string" && typeof m.slug === "string"
    ? {
        id: m.id,
        slug: m.slug,
        name: String(m.name ?? ""),
        town: String(m.town ?? ""),
      }
    : null;
}

function readRecipients(value: unknown): Recipient[] {
  return Array.isArray(value)
    ? value.filter(
        (r): r is Recipient =>
          !!r &&
          typeof r.user_id === "string" &&
          typeof r.email === "string" &&
          r.email.includes("@"),
      )
    : [];
}

type Send = (to: string, email: Email) => Promise<boolean>;

// Sends one email to each recipient, each with their own stop link.
async function sendToEach(
  recipients: Recipient[],
  mandir: Mandir,
  site: string,
  build: (stopLink: string) => Email,
  send: Send,
  code: (userId: string, mandirId: string) => string | null,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const c = code(r.user_id, mandir.id);
    if (!c) {
      failed++;
      continue;
    }
    const email = build(stopUrl(site, r.user_id, mandir.id, c, "seva"));
    const ok = await send(r.email, {
      ...email,
      headers: unsubscribeHeaders(site, r.user_id, mandir.id, c, "seva"),
    });
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

const sevaCode = (userId: string, mandirId: string) =>
  stopCode(userId, mandirId, undefined, "seva");

// Just after someone takes a place: if that filled the seva, tells the
// committee (once; the database marks it told). Never fails loudly.
export async function tellIfSevaFull(
  db: SupabaseClient<Database>,
  shiftId: string,
  site: string,
  deps: {
    send?: Send;
    code?: (userId: string, mandirId: string) => string | null;
  } = {},
): Promise<number> {
  const { data, error } = await db.rpc("seva_full_notice", {
    target_shift: shiftId,
  });
  if (error || !data) return 0;
  const notice = data as {
    mandir?: unknown;
    recipients?: unknown;
    seva?: unknown;
  };
  const mandir = readMandir(notice.mandir);
  const seva = readSeva(notice.seva);
  if (!mandir || !seva) return 0;
  const { sent } = await sendToEach(
    readRecipients(notice.recipients),
    mandir,
    site,
    (stopLink) => sevaFullEmail({ mandir, seva, siteUrl: site, stopLink }),
    deps.send ?? ((to, email) => sendEmail(to, email)),
    deps.code ?? sevaCode,
  );
  return sent;
}

export type SevaRoundupSummary = {
  mandirs: number;
  places: number;
  sent: number;
  failed: number;
  error?: string;
};

// The evening roundup, from the daily job. A mandir is marked done up to
// now once its emails have gone (or it has nobody to send to), so the next
// roundup starts where this one stopped; one whose every send failed is
// tried again tomorrow, with today's places still in it.
export async function runSevaRoundup(
  db: SupabaseClient<Database>,
  site: string,
  deps: {
    send: Send;
    code?: (userId: string, mandirId: string) => string | null;
    now?: Date;
  },
): Promise<SevaRoundupSummary> {
  const until = (deps.now ?? new Date()).toISOString();
  const summary: SevaRoundupSummary = {
    mandirs: 0,
    places: 0,
    sent: 0,
    failed: 0,
  };
  const { data, error } = await db.rpc("seva_roundups_due", { until });
  if (error) {
    summary.error = "The seva places couldn't be read.";
    return summary;
  }
  for (const row of Array.isArray(data) ? data : []) {
    const r = row as { mandir?: unknown; recipients?: unknown; seva?: unknown };
    const mandir = readMandir(r.mandir);
    const seva = Array.isArray(r.seva)
      ? r.seva.flatMap((s) => readSeva(s) ?? [])
      : [];
    if (!mandir || !seva.length) continue;
    const places = seva.reduce((n, s) => n + (s.new ?? 0), 0);
    const recipients = readRecipients(r.recipients);
    const { sent, failed } = await sendToEach(
      recipients,
      mandir,
      site,
      (stopLink) => sevaRoundupEmail({ mandir, seva, siteUrl: site, stopLink }),
      deps.send,
      deps.code ?? sevaCode,
    );
    summary.failed += failed;
    if (recipients.length && sent === 0) continue;
    summary.mandirs++;
    summary.places += places;
    summary.sent += sent;
    await db.from("seva_roundups_sent").insert({
      mandir_id: mandir.id,
      through: until,
      places,
      recipients: sent,
    });
  }
  await db.from("job_runs").insert({ job: "seva-roundup", summary });
  return summary;
}

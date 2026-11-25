import { committeeEmailOn } from "@/lib/committee-email";
import {
  EMAIL_COLOURS as C,
  BODY_FONT,
  HEADING_FONT,
  emailButton,
  emailDateTile,
  emailLayout,
  emailLink,
  emailParagraph,
  escapeHtml,
} from "@/lib/email-layout";
import { formatEventStart } from "@/lib/format";
import { mailerReady, sendEmail } from "@/lib/mailer";
import { eventPath, eventShareText, whatsAppLink } from "@/lib/share";
import type { Email } from "@/lib/weekly-email";

// "It's live": the email to the committee member who has just put events
// on their mandir's page (added one, ticked several, or published a poster
// or WhatsApp message), with each event's link and a WhatsApp button, the
// quickest way to fill the hall. One email per press of the button, however
// many events it published. Sent only to the person who pressed it, and
// only while committee emails are on (COMMITTEE_EMAIL, decision 0023).

export type LiveEvent = {
  id: string;
  title: string;
  // The (next) start, as an ISO time.
  next_starts_at: string;
  all_day: boolean;
  recurrence: string | null;
};

// Events listed one by one; the rest are counted.
const SHOWN = 8;

export function eventLiveEmailOn(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return committeeEmailOn(env.COMMITTEE_EMAIL) && mailerReady(env);
}

export function eventLiveEmail({
  mandir,
  events,
  siteUrl,
}: {
  mandir: { name: string; town: string; slug: string };
  events: LiveEvent[];
  siteUrl: string;
}): Email {
  const many = events.length > 1;
  const first = events[0];
  const subject = many
    ? `${events.length} events are live on ${mandir.name}'s page`
    : `It's live: ${first.title}`;
  const heading = many
    ? `Your ${events.length} events are live`
    : "Your event is live";
  const lead = many
    ? "Families can see them on Toran now. The quickest way to fill the hall: share them in your WhatsApp groups."
    : "Families can see it on Toran now. The quickest way to fill the hall: share it in your WhatsApp groups.";
  const shown = events.slice(0, SHOWN);
  const more = events.length - shown.length;
  const manage = `${siteUrl}/manage/${mandir.slug}`;

  const links = shown.map((e) => {
    const url = `${siteUrl}${eventPath(mandir.slug, e.id)}`;
    return {
      event: e,
      url,
      when: formatEventStart(e.next_starts_at, e.all_day),
      whatsapp: whatsAppLink(eventShareText(e, mandir), url),
    };
  });

  const cards = links.map(({ event, url, when, whatsapp }) =>
    [
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:18px;border-collapse:separate">`,
      `<tr><td style="padding:18px">`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`,
      emailDateTile(event.next_starts_at),
      `<td valign="top">`,
      `<p style="margin:0 0 4px;font-family:${HEADING_FONT};font-size:22px;line-height:1.25;color:${C.ink}">${escapeHtml(event.title)}</p>`,
      `<p style="margin:0 0 12px;font-family:${BODY_FONT};font-size:16px;line-height:1.4;color:${C.muted}">${escapeHtml(when)}</p>`,
      emailButton(whatsapp, "Share on WhatsApp"),
      emailButton(url, "See it on Toran", "outline"),
      `</td></tr></table>`,
      `</td></tr></table>`,
    ].join(""),
  );

  const next = [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.leafTint}" style="background:${C.leafTint};border-radius:16px;margin:4px 0 20px"><tr><td style="padding:16px 18px">`,
    `<p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:16px;font-weight:700;color:${C.leafInk}">&#10003; Confirmed by your mandir</p>`,
    `<p style="margin:0;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${C.ink}">${many ? "They're" : "It's"} on your mandir's page and in What's on, marked as confirmed. People who follow ${escapeHtml(mandir.name)} with phone notifications on hear about new events in the early evening.</p>`,
    `</td></tr></table>`,
  ].join("");

  const html = emailLayout({
    preheader: many
      ? `${events.length} events on ${mandir.name}'s page. Share them on WhatsApp.`
      : `${first.title} is on ${mandir.name}'s page. Share it on WhatsApp.`,
    eyebrow: mandir.name,
    heading,
    lead,
    blocks: [
      ...cards,
      more > 0
        ? emailParagraph(
            `And ${more} more: ${emailLink(manage, "see them all on your committee page")}.`,
          )
        : "",
      next,
      `<p style="margin:0 0 20px">${emailButton(manage, "Open your committee page", "outline")}</p>`,
    ],
    footer: [
      `You get this because you put ${many ? "these events" : "this event"} on ${escapeHtml(mandir.name)}'s page on Toran. It's only sent when you add events.`,
    ],
  });

  const text = [
    "Namaste,",
    "",
    `${heading} on ${mandir.name}'s page on Toran. ${lead}`,
    "",
    ...links.flatMap(({ event, url, when, whatsapp }) => [
      `${event.title}`,
      `${when}`,
      `See it: ${url}`,
      `Share on WhatsApp: ${whatsapp}`,
      "",
    ]),
    ...(more > 0 ? [`And ${more} more: ${manage}`, ""] : []),
    `${many ? "They're" : "It's"} on your mandir's page and in What's on, marked as confirmed by your mandir.`,
    "",
    `Your committee page: ${manage}`,
    "",
    "With thanks,",
    "Toran",
    "",
    `You get this because you put ${many ? "these events" : "this event"} on ${mandir.name}'s page on Toran. It's only sent when you add events.`,
  ].join("\n");

  return { subject, text, html };
}

// Sends it, never failing loudly: the events are live either way.
export async function sendEventLive(
  to: string | null,
  content: Parameters<typeof eventLiveEmail>[0],
  env: Record<string, string | undefined> = process.env,
  send: typeof fetch = fetch,
): Promise<boolean> {
  if (!to || !content.events.length || !eventLiveEmailOn(env)) return false;
  return sendEmail(to, eventLiveEmail(content), env, send);
}

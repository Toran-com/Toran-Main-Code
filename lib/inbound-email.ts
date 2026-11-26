import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  EMAIL_COLOURS as C,
  BODY_FONT,
  HEADING_FONT,
  emailButton,
  emailDateTile,
  emailLayout,
  emailParagraph,
  escapeHtml,
} from "@/lib/email-layout";
import type { EventInput } from "@/lib/event-form";
import { londonDate } from "@/lib/london";
import {
  MAX_MESSAGE_CHARS,
  MAX_POSTER_BYTES,
  isPosterType,
  posterReadingOn,
  readMessage,
  readPoster,
  type ReadResult,
} from "@/lib/poster-reader";
import { queueRead } from "@/lib/poster-queue";
import type { Email } from "@/lib/weekly-email";

// Forwarding to Toran by email (decision 0031). Each mandir has its own
// address, <slug>@<INBOUND_DOMAIN>, shown on its committee page. A
// committee member forwards a poster, a PDF patrika or a message to it
// from the email address they log in with; Resend receives it and tells
// /api/inbound/email, which checks the message is really from them, reads
// the events off it like the committee page does (lib/poster-reader.ts)
// and puts them in "Posters waiting for you" to check. Nothing is
// published without a person pressing Publish. The sender gets a short
// reply saying what was found. The email, its attachments and who sent it
// aren't kept; the pictures and text are sent to Anthropic to be read, as
// on the committee page.
//
// Off unless INBOUND_DOMAIN, RESEND_WEBHOOK_SECRET, RESEND_API_KEY and
// ANTHROPIC_API_KEY are all set (docs/app-setup.md).

type Env = Record<string, string | undefined>;
type Db = SupabaseClient<Database>;

// The most posters read from one email, and the most emails read for one
// mandir in a day.
export const MAX_POSTERS = 3;
export const EMAILS_PER_DAY = 20;
// Pictures smaller than this are logos and signature icons, not posters.
export const MIN_PICTURE_BYTES = 30 * 1024;
// How old a webhook's signature may be, either way.
const TOLERANCE_SECONDS = 5 * 60;

export function inboundDomain(env: Env = process.env): string | null {
  const domain = env.INBOUND_DOMAIN?.trim().toLowerCase();
  return domain && /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain) ? domain : null;
}

export function inboundEmailOn(env: Env = process.env): boolean {
  return Boolean(
    inboundDomain(env) &&
    env.RESEND_WEBHOOK_SECRET?.startsWith("whsec_") &&
    env.RESEND_API_KEY &&
    posterReadingOn(env),
  );
}

// The address a mandir's committee forwards to.
export function forwardingAddress(slug: string, domain: string): string {
  return `${slug}@${domain}`;
}

// Checks a webhook is from Resend (it signs them the Svix way): an HMAC of
// "<id>.<timestamp>.<body>" with the secret after "whsec_", any one of the
// space-separated "v1,<signature>"s matching, within five minutes.
export function verifyWebhook(
  body: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  secret: string,
  now: number = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) {
    return false;
  }
  if (!/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) {
    return false;
  }
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

// The bare address from "Name <someone@example.com>" or "someone@example.com".
export function addressOf(from: string): string | null {
  const inBrackets = from.match(/<([^<>\s]+@[^<>\s]+)>/);
  const address = (inBrackets?.[1] ?? from).trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? address : null;
}

// The mandirs an email was sent to: the slugs of the addresses at Toran's
// receiving domain.
export function addressedSlugs(addresses: string[], domain: string): string[] {
  const slugs = addresses.flatMap((a) => {
    const address = addressOf(a);
    if (!address?.endsWith(`@${domain}`)) return [];
    const local = address.slice(0, -domain.length - 1);
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(local) ? [local] : [];
  });
  return [...new Set(slugs)];
}

export type SenderMandir = {
  id: string;
  slug: string;
  name: string;
  town: string;
  // Emails read for it in the last day.
  today: number;
};

// Which of the sender's mandirs the email is for: the one it was addressed
// to, or the sender's only one.
export function pickMandir(
  mandirs: SenderMandir[],
  slugs: string[],
):
  | { mandir: SenderMandir }
  | { error: "unknown" | "choose" | "too-many"; mandir?: SenderMandir } {
  if (!mandirs.length) return { error: "unknown" };
  const addressed = mandirs.filter((m) => slugs.includes(m.slug));
  const mandir =
    addressed.length === 1
      ? addressed[0]
      : mandirs.length === 1 && !addressed.length
        ? mandirs[0]
        : null;
  if (!mandir) return { error: "choose" };
  if (mandir.today >= EMAILS_PER_DAY) return { error: "too-many", mandir };
  return { mandir };
}

type Authentication = {
  spf?: string;
  dkim?: string;
  dmarc?: string;
} | null;

// Whether the email really is from the address it says. Resend checks it
// as it arrives: DKIM passes only when the signature is from the sender's
// own domain, and DMARC passes only when SPF or DKIM line up with it.
// Anything else (a forged or unsigned email) isn't read.
export function isAuthentic(auth: Authentication | undefined): boolean {
  return auth?.dkim === "pass" || auth?.dmarc === "pass";
}

// The message's words, without the lines an email program adds when
// forwarding (who it was from and to, with their addresses) and without
// any other email address or phone number: only the event details are
// needed (decision 0006).
export function messageText(
  subject: string,
  text: string | null,
  html: string | null,
): string {
  const body =
    text ??
    (html ?? "")
      .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"');
  const lines = [
    subject.replace(/^((re|fwd?|fw)\s*:\s*)+/i, ""),
    ...body.split(/\r?\n/),
  ]
    .map((line) =>
      line
        .replace(/^[>\s]+/, "")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(
      (line) =>
        !/^(from|to|cc|bcc|date|sent|subject|reply-to)\s*:/i.test(line) &&
        !/^-+\s*(forwarded|original) message\s*-+$/i.test(line) &&
        !/^(begin forwarded message|on .+ wrote):?$/i.test(line),
    )
    .map((line) =>
      line
        .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "")
        .replace(/(\+44\s?|\b0)(\d[\s-]?){9,10}\b/g, ""),
    );
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

type ReceivedEmail = {
  from: string;
  to: string[];
  cc?: string[] | null;
  received_for?: string[] | null;
  subject: string | null;
  text: string | null;
  html: string | null;
  message_id?: string | null;
  authentication?: Authentication;
};

type Attachment = {
  id: string;
  filename?: string | null;
  content_type: string;
  content_disposition?: string | null;
  size?: number;
  download_url: string;
};

async function resend<T>(
  path: string,
  env: Env,
  send: typeof fetch,
): Promise<T | null> {
  try {
    const response = await send(`https://api.resend.com${path}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

// The posters attached to an email (or pasted into it), largest first: no
// more than three, none too big to read, no logos.
export function postersAmong(attachments: Attachment[]): Attachment[] {
  return attachments
    .filter(
      (a) =>
        isPosterType(a.content_type) &&
        (a.size ?? 0) <= MAX_POSTER_BYTES &&
        (a.content_type === "application/pdf" ||
          (a.size ?? MIN_PICTURE_BYTES) >= MIN_PICTURE_BYTES),
    )
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_POSTERS);
}

async function download(
  attachment: Attachment,
  send: typeof fetch,
): Promise<Buffer | null> {
  try {
    const response = await send(attachment.download_url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = Buffer.from(await response.arrayBuffer());
    return data.length && data.length <= MAX_POSTER_BYTES ? data : null;
  } catch {
    return null;
  }
}

export type InboundOutcome =
  | "read"
  | "nothing"
  | "failed"
  | "unknown"
  | "unverified"
  | "choose"
  | "too-many";

export type ReplyContent = {
  outcome: Exclude<InboundOutcome, "unverified">;
  subject: string | null;
  mandir?: { slug: string; name: string };
  // For "choose": the sender's mandirs, to forward to the right one.
  mandirs?: { slug: string; name: string }[];
  events?: EventInput[];
  skipped?: number;
  domain: string;
  siteUrl: string;
};

// Shown one by one; the rest are counted.
const SHOWN = 8;

// "18:30" as "6:30pm", as the site shows times.
export function clock(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
}

function eventRow(e: EventInput): string {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${e.date}T12:00:00Z`));
  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px"><tr>`,
    emailDateTile(`${e.date}T12:00:00Z`),
    `<td valign="middle">`,
    `<p style="margin:0 0 2px;font-family:${HEADING_FONT};font-size:21px;line-height:1.25;color:${C.ink}">${escapeHtml(e.title)}</p>`,
    `<p style="margin:0;font-family:${BODY_FONT};font-size:16px;line-height:1.4;color:${C.muted}">${escapeHtml(e.time ? `${when}, ${clock(e.time)}` : when)}</p>`,
    `</td></tr></table>`,
  ].join("");
}

// The reply to whoever forwarded it: what Toran found, and where to check
// it; or why it couldn't read it, and what to do instead.
export function inboundReply(content: ReplyContent): Email {
  const { outcome, mandir, domain, siteUrl } = content;
  const events = content.events ?? [];
  const manage = mandir
    ? `${siteUrl}/manage/${mandir.slug}`
    : `${siteUrl}/manage`;
  const original = content.subject?.trim().slice(0, 120);
  const subject = original
    ? `Re: ${original.replace(/^re:\s*/i, "")}`
    : "Your email to Toran";

  let heading: string;
  let lead: string;
  const blocks: string[] = [];
  const text: string[] = [];

  if (outcome === "read" && mandir) {
    const n = events.length;
    heading = n === 1 ? "Toran found 1 event" : `Toran found ${n} events`;
    lead = `They're waiting for you to check under "Posters waiting for you" on ${mandir.name}'s committee page. Nothing is on your page until you press Publish.`;
    const shown = events.slice(0, SHOWN);
    blocks.push(...shown.map(eventRow));
    if (n > shown.length) {
      blocks.push(
        emailParagraph(`And ${n - shown.length} more.`, { muted: true }),
      );
    }
    if (content.skipped) {
      blocks.push(
        emailParagraph(
          `${content.skipped === 1 ? "1 more was" : `${content.skipped} more were`} left out: already on your page, already waiting, or missing a date.`,
          { muted: true },
        ),
      );
    }
    blocks.push(
      `<p style="margin:8px 0 20px">${emailButton(`${manage}#posters`, "Check and publish")}</p>`,
    );
    text.push(
      ...shown.map(
        (e) => `- ${e.title}, ${e.date}${e.time ? ` ${e.time}` : ""}`,
      ),
      ...(n > shown.length ? [`And ${n - shown.length} more.`] : []),
      "",
      `Check and publish: ${manage}#posters`,
    );
  } else if (outcome === "nothing" && mandir) {
    heading = "Toran couldn't find any new events";
    lead = content.skipped
      ? "The events in your email are already on your page or waiting for you to check."
      : "There were no dated events in your email that are still to come. Toran reads pictures, PDFs and the words of the email.";
    blocks.push(
      `<p style="margin:0 0 20px">${emailButton(manage, "Open your committee page")}</p>`,
    );
    text.push(`Your committee page: ${manage}`);
  } else if (outcome === "failed" && mandir) {
    heading = "Toran couldn't read that one";
    lead =
      "Something went wrong reading your email. Try forwarding it again in a while, or add the poster on your committee page.";
    blocks.push(
      `<p style="margin:0 0 20px">${emailButton(`${manage}#add`, "Add it on your committee page")}</p>`,
    );
    text.push(`Your committee page: ${manage}`);
  } else if (outcome === "too-many" && mandir) {
    heading = "That's a lot for one day";
    lead = `Toran reads up to ${EMAILS_PER_DAY} emails a day for each mandir, and ${mandir.name} has had them. Forward this one again tomorrow, or add it on your committee page.`;
    blocks.push(
      `<p style="margin:0 0 20px">${emailButton(manage, "Open your committee page")}</p>`,
    );
    text.push(`Your committee page: ${manage}`);
  } else if (outcome === "choose") {
    heading = "Which mandir is it for?";
    lead =
      "You look after more than one mandir on Toran. Forward it again to the address of the one it's for:";
    const mandirs = content.mandirs ?? [];
    blocks.push(
      ...mandirs.map((m) =>
        emailParagraph(
          `<strong>${escapeHtml(m.name)}</strong><br>${escapeHtml(forwardingAddress(m.slug, domain))}`,
        ),
      ),
    );
    text.push(
      ...mandirs.map((m) => `${m.name}: ${forwardingAddress(m.slug, domain)}`),
    );
  } else {
    heading = "Toran doesn't know this address";
    lead =
      "Toran only reads emails from the address a committee member logs in with. Forward it again from that address, or ask your committee to invite this one.";
    blocks.push(
      `<p style="margin:0 0 20px">${emailButton(`${siteUrl}/login`, "Log in to Toran")}</p>`,
    );
    text.push(`Log in: ${siteUrl}/login`);
  }

  const html = emailLayout({
    preheader: lead,
    eyebrow: mandir?.name,
    heading,
    lead,
    blocks,
    footer: [
      "You get this because you emailed Toran. Your email and its attachments aren't kept; the pictures and words were read by Anthropic's AI to find the events.",
    ],
  });
  return {
    subject,
    html,
    text: [
      "Namaste,",
      "",
      heading,
      lead,
      "",
      ...text,
      "",
      "With thanks,",
      "Toran",
      "",
      "You get this because you emailed Toran. Your email and its attachments aren't kept.",
    ].join("\n"),
  };
}

// Reading one email that has come in: who it's from, which mandir, the
// posters and words in it, into the review queue, and the reply.
export async function handleInboundEmail(
  db: Db,
  emailId: string,
  {
    env = process.env,
    send = fetch,
    siteUrl,
    now = new Date(),
    readPicture = readPoster,
    readWords = readMessage,
    queue = queueRead,
    reply,
  }: {
    env?: Env;
    send?: typeof fetch;
    siteUrl: string;
    now?: Date;
    readPicture?: typeof readPoster;
    readWords?: typeof readMessage;
    queue?: (
      db: Db,
      mandirId: string,
      from: "email",
      events: EventInput[],
      link: string,
    ) => Promise<{ added: number; skipped: number; queued: EventInput[] }>;
    reply: (to: string, email: Email) => Promise<boolean>;
  },
): Promise<{ outcome: InboundOutcome | "missing"; events: number }> {
  const domain = inboundDomain(env);
  const done = async (
    outcome: InboundOutcome | "missing",
    mandirId: string | null = null,
    events = 0,
  ) => {
    await db
      .from("inbound_emails")
      .update({
        outcome: outcome === "missing" ? "failed" : outcome,
        mandir_id: mandirId,
        events,
      })
      .eq("email_id", emailId);
    return { outcome, events };
  };
  const email = await resend<ReceivedEmail>(
    `/emails/receiving/${encodeURIComponent(emailId)}`,
    env,
    send,
  );
  if (!email || !domain) return done("missing");

  // A forged or unsigned email gets no reply: the address may not be the
  // sender's.
  const sender = addressOf(email.from);
  if (!sender || !isAuthentic(email.authentication)) return done("unverified");

  const subject = email.subject;
  const answer = async (
    content: Omit<ReplyContent, "subject" | "domain" | "siteUrl">,
  ) => {
    const message = inboundReply({ ...content, subject, domain, siteUrl });
    if (email.message_id) {
      message.headers = {
        "In-Reply-To": email.message_id,
        References: email.message_id,
      };
    }
    await reply(sender, message);
  };

  const { data: mandirs } = await db.rpc("inbound_sender_mandirs", { sender });
  const slugs = addressedSlugs(
    [...email.to, ...(email.cc ?? []), ...(email.received_for ?? [])],
    domain,
  );
  const picked = pickMandir((mandirs ?? []) as SenderMandir[], slugs);
  if ("error" in picked) {
    await answer({
      outcome: picked.error,
      mandir: picked.mandir,
      mandirs: (mandirs ?? []).map((m) => ({ slug: m.slug, name: m.name })),
    });
    return done(picked.error, picked.mandir?.id ?? null);
  }
  const { mandir } = picked;
  // Counted for the day from here, whatever comes of it.
  await db
    .from("inbound_emails")
    .update({ mandir_id: mandir.id })
    .eq("email_id", emailId);

  const context = {
    mandir: `${mandir.name}, ${mandir.town}`,
    today: londonDate(now),
  };
  const list = await resend<{ data: Attachment[] }>(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`,
    env,
    send,
  );
  const posters = postersAmong(list?.data ?? []);
  const words = messageText(subject ?? "", email.text, email.html);
  // The words are read when there's no poster, or when there's plenty of
  // them besides (a message with a picture attached).
  const readTheWords =
    words.length >= 10 && (!posters.length || words.length >= 200);

  const reads: Promise<ReadResult>[] = posters.map(async (poster) => {
    const data = await download(poster, send);
    if (!data || !isPosterType(poster.content_type)) {
      return { ok: false, error: "failed" } as const;
    }
    return readPicture({ data, type: poster.content_type }, context);
  });
  if (readTheWords) reads.push(readWords(words, context));
  const results = await Promise.all(reads);
  const found = results.flatMap((r) => (r.ok ? r.events : []));

  if (!results.length || (!found.length && results.every((r) => r.ok))) {
    await answer({ outcome: "nothing", mandir });
    return done("nothing", mandir.id);
  }
  if (!found.length) {
    await answer({ outcome: "failed", mandir });
    return done("failed", mandir.id);
  }
  const { added, skipped, queued } = await queue(
    db,
    mandir.id,
    "email",
    found,
    "",
  );
  if (!added) {
    await answer({ outcome: "nothing", mandir, skipped });
    return done("nothing", mandir.id);
  }
  await answer({ outcome: "read", mandir, events: queued, skipped });
  return done("read", mandir.id, added);
}

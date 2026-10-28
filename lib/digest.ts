// The weekly digest: what's on in the coming week, and festivals in the
// next fortnight, optionally for one region. Previewed by Toran admins,
// and sent as the weekly email (lib/weekly-send.ts), which stays off
// until ICO registration and the DPIA (decision 0006).

import type { FestivalDate } from "@/lib/directory";
import { formatDateRange, formatEventStart, londonDate } from "@/lib/format";
import { eventPath } from "@/lib/share";
import type { ListedEvent } from "@/lib/whats-on";
import { groupByDay } from "@/lib/whats-on-view";

const DAY_MS = 86_400_000;

export type Digest = {
  start: string;
  end: string;
  region: string | null;
  // A place it's been narrowed to, such as "within 10 miles of HA9".
  area: string | null;
  festivals: { name: string; slug: string; when: string; checked: boolean }[];
  days: { heading: string; events: ListedEvent[] }[];
  count: number;
};

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function buildDigest(
  events: readonly ListedEvent[],
  dates: readonly FestivalDate[],
  now: Date,
  region: string | null,
  area: string | null = null,
): Digest {
  const start = londonDate(now);
  const end = addDays(start, 6);
  const week = [...events]
    .sort((a, b) => a.next_starts_at.localeCompare(b.next_starts_at))
    .filter((e) => {
      const day = londonDate(new Date(e.next_starts_at));
      return (
        e.status !== "cancelled" &&
        day >= start &&
        day <= end &&
        (!region || e.mandir.region === region)
      );
    });
  const fortnight = addDays(start, 13);
  const festivals = dates
    .filter((d) => d.festival && d.ends_on >= start && d.starts_on <= fortnight)
    .map((d) => ({
      name: d.festival!.name,
      slug: d.festival!.slug,
      when: formatDateRange(d.starts_on, d.ends_on),
      checked: d.verified,
    }))
    // One line per festival, even when traditions differ on the date.
    .filter((f, i, all) => all.findIndex((g) => g.slug === f.slug) === i);
  return {
    start,
    end,
    region,
    area,
    festivals,
    days: groupByDay(week, null),
    count: week.length,
  };
}

// "7pm", or "All day".
export function eventTime(
  event: Pick<ListedEvent, "next_starts_at" | "all_day">,
) {
  if (event.all_day) return "All day";
  return formatEventStart(event.next_starts_at, false).split(", ").at(-1)!;
}

// "Mon 19 Oct – Sun 25 Oct 2026 (London, within 10 miles of HA9)"
function dates(digest: Digest): string {
  const where = [digest.region, digest.area].filter(Boolean).join(", ");
  return `${formatDateRange(digest.start, digest.end)}${where ? ` (${where})` : ""}`;
}

// The email's subject line.
export function digestTitle(digest: Digest): string {
  return `What's on at mandirs: ${dates(digest)}`;
}

// The digest as plain text, for an email's text part.
export function digestText(digest: Digest, siteUrl: string): string {
  const parts = [digestTitle(digest)];
  if (digest.festivals.length) {
    parts.push(
      [
        "Festivals coming up",
        ...digest.festivals.map(
          (f) =>
            `• ${f.name}: ${f.when}${f.checked ? "" : " (date may vary: check with your mandir)"}`,
        ),
      ].join("\n"),
    );
  }
  if (digest.days.length) {
    for (const day of digest.days) {
      parts.push(
        [
          day.heading,
          ...day.events.map(
            (e) =>
              `• ${eventTime(e)} ${e.title}, ${e.mandir.name} (${e.mandir.town})`,
          ),
        ].join("\n"),
      );
    }
  } else {
    parts.push("No events listed this week yet.");
  }
  parts.push(`More, and what's near you: ${siteUrl}/whats-on`);
  return parts.join("\n\n");
}

// For a WhatsApp broadcast or group: *bold* headings, one line per event.
export function digestWhatsApp(digest: Digest, siteUrl: string): string {
  const parts = [`*What's on at mandirs*\n${dates(digest)}`];
  if (digest.festivals.length) {
    parts.push(
      [
        "*Festivals coming up*",
        ...digest.festivals.map(
          (f) =>
            `• ${f.name}: ${f.when}${f.checked ? "" : " (date may vary: check with your mandir)"}`,
        ),
      ].join("\n"),
    );
  }
  for (const day of digest.days) {
    parts.push(
      [
        `*${day.heading}*`,
        ...day.events.map(
          (e) =>
            `• ${eventTime(e)} ${e.title}, ${e.mandir.name} (${e.mandir.town})`,
        ),
      ].join("\n"),
    );
  }
  if (!digest.days.length) parts.push("No events listed this week yet.");
  parts.push(`More, and what's near you: ${siteUrl}/whats-on 🙏`);
  return parts.join("\n\n");
}

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// The digest as email HTML: simple, with styles written on each element
// (email programs ignore style sheets), and a link to every event.
export function digestHtml(digest: Digest, siteUrl: string): string {
  const font =
    "font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1a2c";
  const heading = `${font};font-size:18px;font-weight:bold;margin:20px 0 6px`;
  const link = "color:#0b6b68";
  const list = "margin:0;padding-left:20px";
  const out = [
    `<div style="${font}">`,
    `<h1 style="${font};font-size:24px;font-weight:bold;margin:0">What's on at mandirs</h1>`,
    `<p style="${font};color:#8a5a00;font-weight:bold;margin:4px 0 0">${escape(dates(digest))}</p>`,
  ];
  if (digest.festivals.length) {
    out.push(
      `<h2 style="${heading}">Festivals coming up</h2>`,
      `<ul style="${list}">`,
    );
    for (const f of digest.festivals) {
      out.push(
        `<li><a href="${escape(`${siteUrl}/festivals/${f.slug}`)}" style="${link}">${escape(f.name)}</a>: ${escape(f.when)}${f.checked ? "" : " <em>(date may vary: check with your mandir)</em>"}</li>`,
      );
    }
    out.push("</ul>");
  }
  for (const day of digest.days) {
    out.push(
      `<h2 style="${heading}">${escape(day.heading)}</h2>`,
      `<ul style="${list}">`,
    );
    for (const e of day.events) {
      out.push(
        `<li><strong>${escape(eventTime(e))}</strong> <a href="${escape(`${siteUrl}${eventPath(e.mandir.slug, e.id)}`)}" style="${link}">${escape(e.title)}</a>, ${escape(e.mandir.name)} (${escape(e.mandir.town)})</li>`,
      );
    }
    out.push("</ul>");
  }
  if (!digest.days.length) {
    out.push(`<p style="${font}">No events listed this week yet.</p>`);
  }
  out.push(
    `<p style="${font};margin-top:20px"><a href="${escape(`${siteUrl}/whats-on`)}" style="${link}">See more, and what's near you</a></p>`,
    "</div>",
  );
  return out.join("\n");
}

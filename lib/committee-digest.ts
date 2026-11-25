import type { CommitteeTask } from "@/lib/committee-tasks";
import { change } from "@/lib/digest-card";
import {
  EMAIL_COLOURS as C,
  BODY_FONT,
  HEADING_FONT,
  emailButton,
  emailDateTile,
  emailHeading,
  emailLayout,
  emailLink,
  emailParagraph,
  escapeHtml,
} from "@/lib/email-layout";
import { formatEventStart } from "@/lib/format";
import { whatsAppLink } from "@/lib/share";
import type { CountSummary, Supporters } from "@/lib/stats";
import type { Email } from "@/lib/weekly-email";

// The weekly email to a mandir's committee (decision 0030): last week on
// their page as pictures and tiles, with the week before to compare. It
// replaced the monthly email (decision 0023). Pure, so the wording and the
// numbers are tested on their own; lib/committee-digest-send.ts sends it.

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Follower counts worth a cheer when the week passes them.
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

// Events listed under "Coming up"; the rest are counted.
const SHOWN = 4;

export type WeekFigures = {
  // Visits each day, Monday first, this week and the week before.
  days: number[];
  before: number[];
  visits: number;
  visitsBefore: number;
  calendar: number;
  calendarBefore: number;
  shares: number;
  sharesBefore: number;
  followers: number;
  newFollowers: number;
  newFollowersBefore: number;
  went: number;
  sevaTaken: number;
  sevaTakenBefore: number;
  // The most visited event page this week, if any had visits.
  topEvent: { id: string; views: number } | null;
};

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The week starting on a Monday, as "16–22 Nov" (or "30 Nov – 6 Dec").
export function weekLabel(weekStart: string): string {
  const fmt = (day: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(
      new Date(`${day}T00:00:00Z`),
    );
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${fmt(weekStart, { day: "numeric" })}–${fmt(end, { day: "numeric", month: "short" })}`
    : `${fmt(weekStart, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short" })}`;
}

// The ISO week a Monday starts, as "2026-W48": the key for "sent this week".
export function weekKey(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  // ISO weeks belong to the year of their Thursday.
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - jan4.getTime()) / 86_400_000 -
        3 +
        ((jan4.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// The Monday of the last full week before a day (YYYY-MM-DD, UK).
export function lastWeekStart(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return addDays(today, -sinceMonday - 7);
}

const EVENT = /\/events\/([0-9a-f-]{36})$/;

// The week's figures from the mandir's counts over both weeks, its pages'
// totals this week, and what its page brought this week and over both.
export function weekFigures({
  weekStart,
  counts,
  weekPaths,
  supporters,
  supportersBoth,
}: {
  weekStart: string;
  counts: CountSummary;
  weekPaths: CountSummary["paths"];
  supporters: Supporters;
  supportersBoth: Supporters;
}): WeekFigures {
  const before = addDays(weekStart, -7);
  const end = addDays(weekStart, 7);
  const perDay = (from: string, metrics: string[]) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(from, i);
      return counts.days
        .filter((d) => d.day === day && metrics.includes(d.metric))
        .reduce((n, d) => n + d.count, 0);
    });
  const sum = (from: string, metrics: string[]) =>
    perDay(from, metrics).reduce((n, x) => n + x, 0);
  const days = perDay(weekStart, ["view"]);
  const beforeDays = perDay(before, ["view"]);
  // Only days inside the two weeks (the counts may reach into today).
  void end;

  const events = new Map<string, number>();
  for (const p of weekPaths) {
    const id = EVENT.exec(p.path)?.[1];
    if (id && p.metric === "view") {
      events.set(id, (events.get(id) ?? 0) + p.count);
    }
  }
  const top = [...events.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    days,
    before: beforeDays,
    visits: days.reduce((n, x) => n + x, 0),
    visitsBefore: beforeDays.reduce((n, x) => n + x, 0),
    calendar: sum(weekStart, ["calendar", "subscribe"]),
    calendarBefore: sum(before, ["calendar", "subscribe"]),
    shares: sum(weekStart, ["share"]),
    sharesBefore: sum(before, ["share"]),
    followers: supporters.followers,
    newFollowers: supporters.newFollowers,
    newFollowersBefore: supportersBoth.newFollowers - supporters.newFollowers,
    went: supporters.went,
    sevaTaken: supporters.sevaTaken,
    sevaTakenBefore: Math.max(
      0,
      supportersBoth.sevaTaken - supporters.sevaTaken,
    ),
    topEvent: top && top[1] > 0 ? { id: top[0], views: top[1] } : null,
  };
}

const grouped = (n: number) => n.toLocaleString("en-GB");
const plural = (n: number, one: string, many: string) =>
  `${grouped(n)} ${n === 1 ? one : many}`;

// The follower count the week passed, if it passed one worth cheering.
export function milestonePassed(
  followers: number,
  newFollowers: number,
): number | null {
  const was = followers - newFollowers;
  return (
    [...MILESTONES].reverse().find((m) => was < m && followers >= m) ?? null
  );
}

// One stat tile: a label, the number, and how it compares with last week.
function tile(label: string, value: number, before: number | null): string {
  const diff = before === null ? 0 : value - before;
  const note =
    before === null
      ? ""
      : diff > 0
        ? `<span style="color:${C.leafInk};font-weight:700">+${grouped(diff)}</span> on last week`
        : diff < 0
          ? `<span style="color:${C.muted};font-weight:700">${grouped(diff)}</span> on last week`
          : "Same as last week";
  return [
    `<td width="50%" valign="top" style="padding:6px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tile}" style="background:${C.tile};border-radius:16px"><tr><td style="padding:16px 16px 14px">`,
    `<p style="margin:0;font-family:${BODY_FONT};font-size:14px;font-weight:700;letter-spacing:0.02em;color:${C.lapis}">${escapeHtml(label)}</p>`,
    `<p style="margin:4px 0 2px;font-family:${HEADING_FONT};font-size:34px;line-height:1.1;color:${C.ink}">${grouped(value)}</p>`,
    note
      ? `<p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.4;color:${C.muted}">${note}</p>`
      : "",
    `</td></tr></table></td>`,
  ].join("");
}

export type DigestContent = {
  mandir: { name: string; slug: string; town?: string };
  weekStart: string;
  figures: WeekFigures;
  topEvent?: { id: string; title: string; views: number } | null;
  // Events in the coming week, soonest first.
  events: { title: string; next_starts_at: string; all_day?: boolean }[];
  tasks: Pick<CommitteeTask, "title" | "detail">[];
  siteUrl: string;
  // The two pictures (lib/digest-card.tsx), when they can be signed.
  cards: { week: string | null; share: string | null };
  // Where this committee member stops it (signed for them). The preview
  // has none.
  stopUrl?: string;
};

export function committeeDigest(content: DigestContent): Email {
  const { mandir, figures: f, siteUrl, cards } = content;
  const week = weekLabel(content.weekStart);
  const vs = change(f.visits, f.visitsBefore);
  const numbers = `${siteUrl}/manage/${mandir.slug}/numbers`;
  const manage = `${siteUrl}/manage/${mandir.slug}`;
  const page = `${siteUrl}/mandirs/${mandir.slug}`;
  const bestIndex = f.days.indexOf(Math.max(...f.days));
  const best =
    f.visits > 0
      ? `${DAY_NAMES[bestIndex]} was your busiest day, with ${plural(f.days[bestIndex], "visit", "visits")}.`
      : null;
  const milestone = milestonePassed(f.followers, f.newFollowers);

  const subject =
    f.visits > 0
      ? `${mandir.name}: ${plural(f.visits, "visit", "visits")} this week${vs && vs.startsWith("Up") ? `, ${vs.toLowerCase().replace(" on last week", "")}` : ""}`
      : `${mandir.name}: your week on Toran`;
  const heading = `Your week, ${week}`;
  const lead =
    f.visits > 0
      ? `${plural(f.visits, "visit", "visits")} to ${mandir.name}'s page on Toran${vs ? `, ${vs.charAt(0).toLowerCase()}${vs.slice(1)}` : ""}.`
      : `A quiet week on ${mandir.name}'s page. Sharing it in your WhatsApp groups is the quickest way to bring visitors.`;

  const alt = [
    `Visits this week: ${grouped(f.visits)}`,
    vs,
    best,
    `${plural(f.followers, "follower", "followers")}`,
  ]
    .filter(Boolean)
    .join(". ");

  const hero = cards.week
    ? `<a href="${escapeHtml(numbers)}" style="display:block;margin:0 0 20px"><img src="${escapeHtml(siteUrl + cards.week)}" width="536" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:16px"></a>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};border-radius:16px;margin:0 0 20px"><tr><td style="padding:22px 24px"><p style="margin:0;font-family:${BODY_FONT};font-size:15px;font-weight:700;color:${C.nightMuted}">Visits this week</p><p style="margin:4px 0;font-family:${HEADING_FONT};font-size:48px;color:${C.onNight}">${grouped(f.visits)}</p>${vs ? `<p style="margin:0;font-family:${BODY_FONT};font-size:16px;font-weight:700;color:${C.gold}">${escapeHtml(vs)}</p>` : ""}</td></tr></table>`;

  const cheer = [
    milestone
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};border-radius:16px;margin:0 0 16px"><tr><td style="padding:16px 20px;font-family:${BODY_FONT};font-size:17px;font-weight:700;color:${C.onNight}"><span style="color:${C.gold}">&#9733;</span> You passed ${grouped(milestone)} followers this week. Congratulations!</td></tr></table>`
      : "",
    best ? emailParagraph(escapeHtml(best)) : "",
  ].join("");

  const tiles = [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -6px 18px;width:calc(100% + 12px)">`,
    `<tr>${tile("New followers", f.newFollowers, f.newFollowersBefore)}${tile("Added to calendars", f.calendar, f.calendarBefore)}</tr>`,
    `<tr>${tile("Shares", f.shares, f.sharesBefore)}${tile("Seva places taken", f.sevaTaken, f.sevaTakenBefore)}</tr>`,
    `</table>`,
  ].join("");

  const top = content.topEvent
    ? [
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:18px;border-collapse:separate"><tr><td style="padding:18px 20px">`,
        `<p style="margin:0 0 4px;font-family:${BODY_FONT};font-size:14px;font-weight:700;letter-spacing:0.02em;color:${C.goldInk}">MOST VISITED EVENT</p>`,
        `<p style="margin:0 0 4px;font-family:${HEADING_FONT};font-size:22px;line-height:1.25;color:${C.ink}">${escapeHtml(content.topEvent.title)}</p>`,
        `<p style="margin:0 0 12px;font-family:${BODY_FONT};font-size:16px;color:${C.muted}">${plural(content.topEvent.views, "visit", "visits")} this week</p>`,
        emailButton(
          whatsAppLink(
            `${content.topEvent.title} at ${mandir.name}`,
            `${siteUrl}/mandirs/${mandir.slug}/events/${content.topEvent.id}`,
          ),
          "Share it again",
        ),
        `</td></tr></table>`,
      ].join("")
    : "";

  const coming = content.events.length
    ? [
        emailHeading("Coming up", 22),
        ...content.events
          .slice(0, SHOWN)
          .map((e) =>
            [
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px"><tr>`,
              emailDateTile(e.next_starts_at),
              `<td valign="middle"><p style="margin:0;font-family:${BODY_FONT};font-size:17px;font-weight:700;line-height:1.35;color:${C.ink}">${escapeHtml(e.title)}</p><p style="margin:2px 0 0;font-family:${BODY_FONT};font-size:15px;color:${C.muted}">${escapeHtml(formatEventStart(e.next_starts_at, e.all_day ?? false))}</p></td>`,
              `</tr></table>`,
            ].join(""),
          ),
        content.events.length > SHOWN
          ? emailParagraph(
              `And ${content.events.length - SHOWN} more on ${emailLink(page, "your page")}.`,
              { muted: true, size: 16 },
            )
          : "",
      ].join("")
    : [
        emailHeading("Coming up", 22),
        emailParagraph(
          `Nothing is coming up on your page, so families see an empty page. ${emailLink(manage, "Add your next event")}: it takes a minute.`,
        ),
      ].join("");

  const todo = content.tasks.length
    ? [
        emailHeading("Worth doing this week", 22),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">`,
        ...content.tasks.map(
          (t) =>
            `<tr><td width="30" valign="top" style="padding:3px 0 10px;font-family:${BODY_FONT};font-size:18px;color:${C.gold}">&#9675;</td><td valign="top" style="padding:0 0 10px;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${C.ink}"><strong>${escapeHtml(t.title)}</strong> ${escapeHtml(t.detail)}</td></tr>`,
        ),
        `</table>`,
      ].join("")
    : "";

  const shareText = `This week ${plural(f.visits, "person", "people")} visited ${mandir.name} on Toran. See what's on and follow us:`;
  const share = cards.share
    ? [
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.sunk}" style="background:${C.sunk};border-radius:18px;margin:8px 0 20px"><tr>`,
        `<td width="150" valign="middle" style="padding:16px"><a href="${escapeHtml(siteUrl + cards.share)}"><img src="${escapeHtml(siteUrl + cards.share)}" width="130" height="130" alt="A picture of ${escapeHtml(mandir.name)}'s week on Toran" style="display:block;width:130px;height:130px;border:0;border-radius:12px"></a></td>`,
        `<td valign="middle" style="padding:16px 16px 16px 0"><p style="margin:0 0 6px;font-family:${HEADING_FONT};font-size:20px;color:${C.ink}">Share your week</p><p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:15px;line-height:1.45;color:${C.muted}">Save the picture and post it in your groups with your page's link.</p>`,
        emailButton(whatsAppLink(shareText, page), "Send on WhatsApp"),
        `</td></tr></table>`,
      ].join("")
    : "";

  const html = emailLayout({
    preheader:
      f.visits > 0
        ? `${plural(f.visits, "visit", "visits")}${vs ? `, ${vs.charAt(0).toLowerCase()}${vs.slice(1)}` : ""}. ${plural(f.newFollowers, "new follower", "new followers")}.`
        : "Your week on Toran, and what's coming up.",
    eyebrow: mandir.name,
    heading,
    lead,
    blocks: [
      hero,
      cheer,
      tiles,
      top,
      coming,
      todo,
      share,
      `<p style="margin:4px 0 20px">${emailButton(numbers, "See all your numbers")}${emailButton(manage, "Your committee page", "outline")}</p>`,
    ],
    footer: [
      `You get this every Monday because you help run ${escapeHtml(mandir.name)}'s page on Toran. The numbers are counts only: Toran never knows who visited.`,
      content.stopUrl
        ? emailLink(content.stopUrl, "Stop the weekly email")
        : "To stop it: (a link just for each committee member)",
    ],
  });

  const text = [
    "Namaste,",
    "",
    `Your week on Toran, ${week}: ${lead}`,
    "",
    ...(milestone
      ? [
          `You passed ${grouped(milestone)} followers this week. Congratulations!`,
          "",
        ]
      : []),
    ...(best ? [best, ""] : []),
    `- ${plural(f.followers, "person follows", "people follow")} your mandir (${f.newFollowers >= 0 ? "+" : ""}${grouped(f.newFollowers)} this week)`,
    `- ${plural(f.calendar, "event", "events")} added to calendars`,
    `- ${plural(f.shares, "share", "shares")} on WhatsApp and elsewhere`,
    `- ${plural(f.sevaTaken, "seva place", "seva places")} taken on Toran`,
    ...(f.went > 0
      ? [
          `- ${plural(f.went, "person", "people")} said they went to your events`,
        ]
      : []),
    "",
    ...(content.topEvent
      ? [
          `Most visited event: ${content.topEvent.title} (${plural(content.topEvent.views, "visit", "visits")})`,
          "",
        ]
      : []),
    ...(content.events.length
      ? [
          "Coming up:",
          ...content.events
            .slice(0, SHOWN)
            .map(
              (e) =>
                `- ${formatEventStart(e.next_starts_at, e.all_day ?? false)}: ${e.title}`,
            ),
          ...(content.events.length > SHOWN
            ? [`- and ${content.events.length - SHOWN} more`]
            : []),
        ]
      : [
          "Nothing is coming up on your page. Families see an empty page: add your next event.",
        ]),
    "",
    ...(content.tasks.length
      ? [
          "Worth doing this week:",
          ...content.tasks.map((t) => `- ${t.title} ${t.detail}`),
          "",
        ]
      : []),
    `All your numbers: ${numbers}`,
    "",
    "With thanks,",
    "Toran",
    "",
    `You get this every Monday because you help run ${mandir.name}'s page on Toran.`,
    `To stop it: ${content.stopUrl ?? "(a link just for each committee member)"}`,
  ].join("\n");

  return { subject, text, html };
}

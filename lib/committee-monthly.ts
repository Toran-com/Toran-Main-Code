// The monthly email to a mandir's committee: how its page did over the
// last four weeks, who follows it, what's coming up, and anything to do.
// Sent by the weekly job once a month (lib/committee-monthly-send.ts) and
// previewed in /ops/committee-email. Pure, so the wording is tested on its
// own.

import type { CommitteeTask } from "@/lib/committee-tasks";
import { formatEventStart } from "@/lib/format";
import type { MandirNumbers, Supporters } from "@/lib/stats";

export const MONTHLY_DAYS = 28;
// Events listed under "Coming up"; the rest are counted.
const SHOWN = 5;

export type CommitteeMonthly = { subject: string; text: string; html: string };

export function committeeMonthly({
  mandir,
  numbers,
  supporters,
  events,
  tasks,
  siteUrl,
  stopUrl,
}: {
  mandir: { name: string; slug: string };
  numbers: Pick<MandirNumbers, "totals" | "pageViews">;
  // Followers, asks, I went and seva taken on Toran (decision 0022).
  supporters?: Supporters;
  // Upcoming events, soonest first.
  events: { title: string; next_starts_at: string; all_day?: boolean }[];
  tasks: Pick<CommitteeTask, "title" | "detail">[];
  siteUrl: string;
  // Where this committee member stops the email (signed for them). The
  // preview has none.
  stopUrl?: string;
}): CommitteeMonthly {
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  const { totals } = numbers;
  const eventViews = Math.max(totals.view - numbers.pageViews, 0);

  const lines = [
    "Namaste,",
    "",
    `Here's how ${mandir.name}'s page on Toran did over the last four weeks:`,
    "",
    `- ${plural(numbers.pageViews, "visit", "visits")} to your page, and ${plural(eventViews, "visit", "visits")} to your events`,
    `- ${plural(totals.calendar, "event", "events")} added to calendars, ${plural(totals.subscribe, "calendar subscription", "calendar subscriptions")}`,
    `- ${plural(totals.share, "share", "shares")} on WhatsApp and elsewhere`,
  ];
  if (supporters) {
    const gained =
      supporters.newFollowers > 0 ? ` (${supporters.newFollowers} new)` : "";
    lines.push(
      supporters.followers > 0
        ? `- ${plural(supporters.followers, "person follows", "people follow")} your mandir on Toran${gained}`
        : "- Nobody follows your mandir on Toran yet: share your page in your WhatsApp groups and ask people to press Follow",
    );
    if (supporters.went > 0) {
      lines.push(
        `- ${plural(supporters.went, "person", "people")} said they went to your events`,
      );
    }
    if (supporters.sevaTaken > 0) {
      lines.push(
        `- ${plural(supporters.sevaTaken, "seva place", "seva places")} taken on Toran`,
      );
    }
  }
  lines.push("");

  if (events.length) {
    lines.push(`Coming up (${plural(events.length, "event", "events")}):`);
    for (const e of events.slice(0, SHOWN)) {
      lines.push(
        `- ${formatEventStart(e.next_starts_at, e.all_day ?? false)}: ${e.title}`,
      );
    }
    if (events.length > SHOWN) {
      lines.push(`- and ${events.length - SHOWN} more`);
    }
  } else {
    lines.push(
      "Nothing is coming up on your page. Families see an empty page: add your next event, or bring back one from last year.",
    );
  }
  lines.push("");

  if (tasks.length) {
    lines.push("Worth doing this month:");
    for (const t of tasks) {
      const stop = /[.?!]$/.test(t.title) ? "" : ".";
      lines.push(`- ${t.title}${stop} ${t.detail}`);
    }
  } else {
    lines.push("Nothing to do. Thank you for keeping your page up to date.");
  }

  lines.push(
    "",
    `Your page: ${siteUrl}/manage/${mandir.slug}`,
    "",
    "With thanks,",
    "Toran",
    "",
    `You get this once a month because you help run ${mandir.name}'s page on Toran.`,
    `To stop it: ${stopUrl ?? "(a link just for each committee member)"}`,
  );

  const text = lines.join("\n");
  return {
    subject: `${mandir.name}: your month on Toran`,
    text,
    html: emailHtml(text),
  };
}

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const FONT =
  "font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1a2c";

// The same email as simple HTML: paragraphs, "- " lines as a list, and
// web addresses as links.
export function emailHtml(text: string): string {
  const linked = (line: string) =>
    escape(line).replace(
      /https?:\/\/[^\s<]+/g,
      (url) => `<a href="${url}" style="color:#0b6b68">${url}</a>`,
    );
  const blocks = text.split(/\n{2,}/).map((block) => {
    const rows = block.split("\n");
    const items = rows.filter((r) => r.startsWith("- "));
    const rest = rows.filter((r) => !r.startsWith("- "));
    const parts: string[] = [];
    if (rest.length) parts.push(`<p>${rest.map(linked).join("<br>")}</p>`);
    if (items.length) {
      parts.push(
        `<ul>${items.map((r) => `<li>${linked(r.slice(2))}</li>`).join("")}</ul>`,
      );
    }
    return parts.join("\n");
  });
  return `<div style="${FONT}">\n${blocks.join("\n")}\n</div>`;
}

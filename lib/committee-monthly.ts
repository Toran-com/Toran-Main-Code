// The monthly email to a mandir's committee: how its page did over the
// last four weeks, what's coming up, and anything to do. Only previewed in
// /ops/committee-email for now. Nothing sends it: emails to committees wait
// for the ICO registration and DPIA (decision 0006). Pure, so the wording
// is tested on its own.

import type { CommitteeTask } from "@/lib/committee-tasks";
import { formatEventStart } from "@/lib/format";
import type { MandirNumbers } from "@/lib/stats";

export const MONTHLY_DAYS = 28;
// Events listed under "Coming up"; the rest are counted.
const SHOWN = 5;

export type CommitteeMonthly = { subject: string; text: string };

export function committeeMonthly({
  mandir,
  numbers,
  events,
  tasks,
  siteUrl,
}: {
  mandir: { name: string; slug: string };
  numbers: Pick<MandirNumbers, "totals" | "pageViews">;
  // Upcoming events, soonest first.
  events: { title: string; next_starts_at: string; all_day?: boolean }[];
  tasks: Pick<CommitteeTask, "title" | "detail">[];
  siteUrl: string;
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
    "",
  ];

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
    `You get this once a month because you help run ${mandir.name}'s page on Toran. Reply "stop" and we won't send it again.`,
  );

  return {
    subject: `${mandir.name}: your month on Toran`,
    text: lines.join("\n"),
  };
}

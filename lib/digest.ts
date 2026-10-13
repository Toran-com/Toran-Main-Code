// The weekly digest: what's on in the coming week, and festivals in the
// next fortnight, optionally for one region. Only previewed by Toran
// admins for now: there is no sign-up or subscriber list until ICO
// registration and the DPIA (decision 0006).

import type { FestivalDate } from "@/lib/directory";
import { formatDateRange, formatEventStart, londonDate } from "@/lib/format";
import type { ListedEvent } from "@/lib/whats-on";
import { groupByDay } from "@/lib/whats-on-view";

const DAY_MS = 86_400_000;

export type Digest = {
  start: string;
  end: string;
  region: string | null;
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

// The digest as plain text, for an email's text part or a WhatsApp
// broadcast.
export function digestText(digest: Digest, siteUrl: string): string {
  const title = `What's on at mandirs: ${formatDateRange(digest.start, digest.end)}${digest.region ? ` (${digest.region})` : ""}`;
  const parts = [title];
  if (digest.festivals.length) {
    parts.push(
      [
        "Festivals coming up",
        ...digest.festivals.map(
          (f) =>
            `• ${f.name}: ${f.when}${f.checked ? "" : " (date not yet checked)"}`,
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

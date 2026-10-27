import { formatEventStart } from "@/lib/format";
import { londonDate } from "@/lib/london";

// "This week at our mandir": the next seven days' events as one message,
// for a committee to paste into its WhatsApp groups each week, with a
// link to the rest on Toran.

const DAY_MS = 86_400_000;

export type WeekEvent = {
  title: string;
  next_starts_at: string;
  all_day: boolean;
  status: string;
};

export function weekEvents<T extends WeekEvent>(
  events: readonly T[],
  now: Date,
): T[] {
  const first = londonDate(now);
  const last = londonDate(new Date(now.getTime() + 6 * DAY_MS));
  return events
    .filter((e) => {
      const day = londonDate(new Date(e.next_starts_at));
      return e.status === "published" && day >= first && day <= last;
    })
    .sort((a, b) => a.next_starts_at.localeCompare(b.next_starts_at));
}

export function weekMessage(
  mandir: { name: string },
  events: readonly WeekEvent[],
  pageUrl: string,
): string {
  return [
    `This week at ${mandir.name}:`,
    events
      .map(
        (e) => `• ${formatEventStart(e.next_starts_at, e.all_day)}: ${e.title}`,
      )
      .join("\n"),
    `Everything coming up: ${pageUrl}`,
  ].join("\n\n");
}

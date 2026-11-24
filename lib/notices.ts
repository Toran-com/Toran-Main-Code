// Notices from a committee to visitors (mandir_notices): the quick picks
// offered, and the last day a notice applies, from the form's choice.
// Pure, so it's tested on its own.

export const NOTICE_MAX = 200;
export const NOTICES_AT_ONCE = 3;

// Ready-made starts, which the committee finishes or changes.
export const NOTICE_PICKS = [
  "The mandir is closed today.",
  "Aarti is at a different time today: ",
  "The car park is closed today. Please park on the street.",
  "Tonight's event is cancelled. Sorry for the short notice.",
] as const;

export type NoticeLength = "today" | "tomorrow" | "week" | "date";

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// The last day a notice shows, or null if the choice isn't allowed (in
// the past, or more than a month ahead).
export function noticeUntil(
  length: string,
  date: string,
  today: string,
): string | null {
  const last =
    length === "today"
      ? today
      : length === "tomorrow"
        ? addDays(today, 1)
        : length === "week"
          ? addDays(today, 6)
          : /^\d{4}-\d{2}-\d{2}$/.test(date)
            ? date
            : null;
  if (!last || last < today || last > addDays(today, 31)) return null;
  return last;
}

export function cleanNotice(body: string): string | null {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length >= 3 && text.length <= NOTICE_MAX ? text : null;
}

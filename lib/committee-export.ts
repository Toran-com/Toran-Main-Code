import { EVENT_KINDS, kindLabel } from "@/lib/event-kinds";
import { londonDate, londonTime } from "@/lib/london";
import { describeRule, parseRule } from "@/lib/recurrence";
import { eventPath } from "@/lib/share";
import type { MandirNumbers } from "@/lib/stats";

// A committee's events and their numbers as a spreadsheet file (CSV), for
// committee meetings and annual reports. Only what the committee can
// already see on its own pages: no one's personal details.

export type ExportEvent = {
  id: string;
  title: string;
  title_gu: string | null;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurrence: string | null;
  status: string;
  seva_open: boolean;
};

export const EXPORT_COLUMNS = [
  "Date",
  "Starts",
  "Ends",
  "Event",
  "Gujarati name",
  "Type",
  "Repeats",
  "Status",
  "Seva rota",
  "Web page",
  "Views",
  "Added to a calendar",
  "Shared",
] as const;

const STATUS: Record<string, string> = {
  published: "On the site",
  draft: "Draft",
  cancelled: "Cancelled",
};

// One cell. Spreadsheets run anything starting with = + - @ as a formula,
// so such text gets a leading apostrophe and shows as written.
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Lines end in \r\n and the file starts with a byte-order mark, so Excel
// opens it as UTF-8 and the Gujarati comes out right.
export function toCsv(rows: (string | number)[][]): string {
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

// The events that belong in a file covering `since` onwards: those on or
// after that day, repeating ones still going then, and any seen in the
// period.
export function exportRows({
  events,
  numbers,
  since,
  slug,
  origin,
}: {
  events: ExportEvent[];
  numbers: MandirNumbers;
  since: string;
  slug: string;
  origin: string;
}): (string | number)[][] {
  const seen = new Map(numbers.events.map((e) => [e.id, e]));
  const rows = events
    .filter(
      (e) =>
        e.status !== "removed" &&
        (londonDate(new Date(e.starts_at)) >= since ||
          (e.recurrence && (parseRule(e.recurrence)?.until ?? "") >= since) ||
          seen.has(e.id)),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((e) => {
      const n = seen.get(e.id);
      const at = new Date(e.starts_at);
      return [
        londonDate(at),
        e.all_day ? "All day" : londonTime(at),
        e.ends_at && !e.all_day ? londonTime(new Date(e.ends_at)) : "",
        e.title,
        e.title_gu ?? "",
        kindLabel(e.kind) ??
          EVENT_KINDS[e.kind as keyof typeof EVENT_KINDS] ??
          e.kind,
        (e.recurrence && describeRule(e.recurrence)) ?? "",
        STATUS[e.status] ?? e.status,
        e.seva_open ? "Open" : "",
        `${origin}${eventPath(slug, e.id)}`,
        n?.views ?? 0,
        n?.calendar ?? 0,
        n?.share ?? 0,
      ];
    });
  return [
    [...EXPORT_COLUMNS],
    [
      "",
      "",
      "",
      "Your mandir's page",
      "",
      "",
      "",
      "",
      "",
      `${origin}/mandirs/${slug}`,
      numbers.pageViews,
      "",
      "",
    ],
    ...rows,
  ];
}

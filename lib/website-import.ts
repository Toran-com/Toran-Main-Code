// Events read by hand from mandirs' own websites (a Diwali programme page,
// say), pasted into /ops/posters as rows copied from a spreadsheet. Each
// becomes a waiting claim "From the mandir's website", for the committee
// (or Toran) to check before it's published. This file only reads and
// checks the rows; the server action saves them.

import { checkEvent, type EventError, type EventInput } from "@/lib/event-form";
import { checkLink } from "@/lib/posters";
import { compareEvents } from "@/lib/duplicates";

// Columns, in order. Copy them from the research sheet's header.
export const IMPORT_COLUMNS = [
  "mandir",
  "date",
  "time",
  "title",
  "link",
  "kind",
  "summary",
  "title_gu",
] as const;

export const MAX_IMPORT_ROWS = 200;

export type ImportRow = {
  line: number;
  slug: string;
  input: EventInput;
  link: string;
};

export type ImportProblem = {
  line: number;
  problem:
    | EventError
    | "columns"
    | "mandir"
    | "link"
    | "repeated"
    | "toomany"
    | "failed";
};

// "shree-ram-mandir-leicester", "/mandirs/shree-ram-mandir-leicester" or
// the full address of the mandir's page on Toran.
export function mandirSlug(value: string): string | null {
  const text = value.trim();
  const fromPath = /\/mandirs\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:[?#].*)?$/.exec(
    text,
  );
  const slug = fromPath ? fromPath[1] : text;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

// Rows are separated by tabs, as a spreadsheet copies them. A header row
// (starting "mandir") and empty lines are skipped. Every problem is
// reported with its line, and good rows are kept, so the whole paste can
// be fixed and sent again: anything already added is skipped then.
export function parseWebsiteEvents(
  text: string,
  now: Date = new Date(),
): { rows: ImportRow[]; problems: ImportProblem[] } {
  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const cells = raw.split("\t").map((c) => c.trim());
    if (cells[0].toLowerCase() === "mandir") return;
    if (rows.length + problems.length >= MAX_IMPORT_ROWS) {
      if (!problems.some((p) => p.problem === "toomany")) {
        problems.push({ line, problem: "toomany" });
      }
      return;
    }
    if (cells.length < 5) {
      problems.push({ line, problem: "columns" });
      return;
    }
    const [mandir, date, time, title, link, kind, summary, titleGu] = cells;
    const slug = mandirSlug(mandir);
    if (!slug) {
      problems.push({ line, problem: "mandir" });
      return;
    }
    // Where it was read is the point: "From the mandir's website" needs
    // the page, so a committee can check it.
    if (!link || !checkLink(link)) {
      problems.push({ line, problem: "link" });
      return;
    }
    const input: EventInput = {
      title,
      date,
      time: /^\d:\d{2}$/.test(time) ? `0${time}` : time,
      summary: summary ?? "",
      repeat: "none",
      until: "",
      title_gu: titleGu ?? "",
      kind: kind?.toLowerCase() || "other",
    };
    const checked = checkEvent(input, now);
    if (!checked.ok) {
      problems.push({ line, problem: checked.error });
      return;
    }
    // The same event twice in one paste, however it's spelled.
    if (
      rows.some(
        (r) => r.slug === slug && compareEvents(r.input, input) === "same",
      )
    ) {
      problems.push({ line, problem: "repeated" });
      return;
    }
    rows.push({ line, slug, input, link });
  });

  return { rows, problems };
}

// What each problem means, for the admin who pasted the rows.
export const IMPORT_PROBLEMS: Record<ImportProblem["problem"], string> = {
  title: "the name needs 2 to 120 characters",
  summary: "the description is over 280 characters",
  titleGu: "the Gujarati name needs 2 to 120 characters",
  summaryGu: "the Gujarati description is over 280 characters",
  kind: "the kind isn't one Toran knows (festival, aarti, bhajan, katha, class, seva, youth, community, other)",
  date: "the date isn't from today to two years ahead, as YYYY-MM-DD",
  time: "the time isn't HH:MM (leave it empty for all day)",
  repeat: "it can't repeat",
  until: "it can't repeat",
  columns:
    "it needs at least mandir, date, time, name and link, separated by tabs",
  mandir: "Toran has no mandir with that page address",
  link: "it needs the address of the page it was read from, starting https://",
  repeated: "the same event is already in this paste",
  toomany: `only the first ${MAX_IMPORT_ROWS} rows were read; send the rest separately`,
  failed: "it couldn't be saved; try again",
};

// Many mandirs at once (/ops/mandirs/import): rows pasted from a
// spreadsheet, checked like the "Add a mandir" form, each with a warning
// when it looks like a mandir already listed (or one earlier in the
// paste). This file only reads and checks the rows; the server action
// saves the new ones.

import {
  FORM_ERRORS,
  parseMandirDetails,
  REGIONS,
  slugFor,
  type MandirDetails,
} from "@/lib/mandir-form";

// Columns, in order. Website, phone and tradition can be left empty.
export const MANDIR_IMPORT_COLUMNS = [
  "name",
  "town",
  "region",
  "postcode",
  "website",
  "phone",
  "tradition",
] as const;

export const MAX_MANDIR_ROWS = 200;

export type Listed = {
  slug: string;
  name: string;
  town: string;
  postcode: string | null;
  website: string | null;
  phone: string | null;
};

export type CheckedRow =
  | { line: number; status: "new"; values: MandirDetails }
  | {
      line: number;
      status: "duplicate";
      values: MandirDetails;
      // The listed (or pasted) mandir it looks like, and why.
      like: string;
      because: "postcode" | "website" | "phone" | "name";
    }
  | { line: number; status: "problem"; text: string; problem: string };

// Words that don't tell two mandirs apart.
const COMMON = new Set([
  "shri",
  "shree",
  "sri",
  "hindu",
  "mandir",
  "temple",
  "the",
  "and",
  "of",
  "uk",
  "society",
  "centre",
  "center",
  "community",
  "cultural",
  "association",
  "trust",
]);

function nameWords(name: string, town: string): Set<string> {
  const townWords = new Set(town.toLowerCase().split(/[^a-z0-9]+/));
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !COMMON.has(w) && !townWords.has(w)),
  );
}

const siteOf = (url: string | null) =>
  url
    ? url
        .toLowerCase()
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/+$/, "")
    : null;
const digits = (phone: string | null) =>
  phone ? phone.replace(/\D/g, "").replace(/^44/, "0") : null;

// The listed mandir a new one looks like, if any: the same postcode,
// website or phone number, or nearly the same name in the same town.
export function lookalike(
  row: MandirDetails,
  listed: readonly Listed[],
): { like: Listed; because: "postcode" | "website" | "phone" | "name" } | null {
  const words = nameWords(row.name, row.town);
  for (const m of listed) {
    if (row.postcode && m.postcode && row.postcode === m.postcode) {
      return { like: m, because: "postcode" };
    }
    if (row.website && siteOf(row.website) === siteOf(m.website)) {
      return { like: m, because: "website" };
    }
    if (row.phone && digits(row.phone) === digits(m.phone)) {
      return { like: m, because: "phone" };
    }
    if (m.town.toLowerCase() === row.town.toLowerCase()) {
      const theirs = nameWords(m.name, m.town);
      const shared = [...words].filter((w) => theirs.has(w)).length;
      const all = new Set([...words, ...theirs]).size;
      if (
        slugFor(m.name, m.town) === slugFor(row.name, row.town) ||
        (all > 0 && shared / all >= 0.6)
      ) {
        return { like: m, because: "name" };
      }
    }
  }
  return null;
}

// Rows separated by tabs, as a spreadsheet copies them (or commas, for a
// paste without tabs). A header row (starting "name") and empty lines are
// skipped. A region is matched whatever its capitals.
export function checkMandirRows(
  text: string,
  listed: readonly Listed[],
): CheckedRow[] {
  const checked: CheckedRow[] = [];
  // Rows earlier in the paste, and their lines.
  const pasted = new Map<Listed, number>();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const cells = (raw.includes("\t") ? raw.split("\t") : raw.split(",")).map(
      (c) => c.trim(),
    );
    if (cells[0].toLowerCase() === "name") return;
    const problem = (code: string) =>
      checked.push({
        line,
        status: "problem",
        text: raw.trim().slice(0, 120),
        problem: code,
      });
    if (checked.length >= MAX_MANDIR_ROWS) {
      if (
        !checked.some((c) => c.status === "problem" && c.problem === "toomany")
      ) {
        problem("toomany");
      }
      return;
    }
    if (cells.length < 4) return problem("columns");
    const form = new FormData();
    MANDIR_IMPORT_COLUMNS.forEach((column, i) => {
      form.set(column, cells[i] ?? "");
    });
    const region = REGIONS.find(
      (r) => r.toLowerCase() === (cells[2] ?? "").toLowerCase(),
    );
    if (region) form.set("region", region);
    const parsed = parseMandirDetails(form);
    if (!parsed.ok) return problem(parsed.error);
    const values = parsed.values;
    const match = lookalike(values, [...listed, ...pasted.keys()]);
    pasted.set(
      {
        slug: "",
        name: values.name,
        town: values.town,
        postcode: values.postcode,
        website: values.website,
        phone: values.phone,
      },
      line,
    );
    checked.push(
      match
        ? {
            line,
            status: "duplicate",
            values,
            like: pasted.has(match.like)
              ? `line ${pasted.get(match.like)} of this paste`
              : `${match.like.name}, ${match.like.town}`,
            because: match.because,
          }
        : { line, status: "new", values },
    );
  });
  return checked;
}

export const IMPORT_PROBLEMS: Record<string, string> = {
  ...FORM_ERRORS,
  region: `The region must be one of: ${REGIONS.join(", ")}.`,
  columns: `Needs at least name, town, region and postcode, separated by tabs (${MANDIR_IMPORT_COLUMNS.join(", ")}).`,
  toomany: `At most ${MAX_MANDIR_ROWS} rows at a time.`,
};

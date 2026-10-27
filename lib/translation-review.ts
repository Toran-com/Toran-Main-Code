// The review packs, one for Gujarati and one for Hindi: every line of the
// site's wording, English and the translation side by side, marked "new"
// when no reviewer has checked it yet and "changed" when the English or
// the translation has changed since. What was checked is kept in the
// database (translation_checks), one row a line for each language.

import type { Locale } from "@/lib/i18n";

export type ReviewLocale = Exclude<Locale, "en">;

// What the packs call each language, in English and in itself.
export const REVIEW_LANGUAGES: Record<
  ReviewLocale,
  { english: string; own: string }
> = {
  gu: { english: "Gujarati", own: "ગુજરાતી" },
  hi: { english: "Hindi", own: "हिन्दी" },
};

export function reviewLocale(value: unknown): ReviewLocale {
  return value === "hi" ? "hi" : "gu";
}

export type LineStatus = "new" | "changed" | "checked";

export type Checked = { english: string; translation: string };

export type ReviewLine = {
  // Numbered in the order of the full list, so a reviewer's "312: better
  // as …" means the same line whichever pack they were sent.
  number: number;
  key: string;
  english: string;
  translation: string;
  status: LineStatus;
  // What it said when it was last checked, for a changed line.
  was?: Checked;
};

export function reviewLines(
  english: Record<string, string>,
  translated: Partial<Record<string, string>>,
  checked: ReadonlyMap<string, Checked>,
): ReviewLine[] {
  return Object.keys(english).map((key, i) => {
    const line = {
      number: i + 1,
      key,
      english: english[key],
      translation: translated[key] ?? "",
    };
    const before = checked.get(key);
    if (!before) return { ...line, status: "new" };
    if (
      before.english === line.english &&
      before.translation === line.translation
    )
      return { ...line, status: "checked" };
    return { ...line, status: "changed", was: before };
  });
}

export const toReview = (lines: ReviewLine[]) =>
  lines.filter((l) => l.status !== "checked");

// The list to paste into an email or WhatsApp for a reviewer.
export function reviewerText(
  lines: ReviewLine[],
  locale: ReviewLocale,
): string {
  const { english, own } = REVIEW_LANGUAGES[locale];
  return [
    `Toran: ${english} wording to check. For each line, is the ${english} right, natural and polite? Reply with the number and a better version.`,
    ...lines.map(
      (l) =>
        `${l.number}.${l.status === "changed" ? " (changed)" : ""} English: ${l.english}\n    ${own}: ${l.translation}`,
    ),
  ].join("\n\n");
}

// A short fingerprint of a line as shown, so "Mark as checked" only
// records lines that haven't changed since the page was opened.
export function lineStamp(english: string, translation: string): string {
  let hash = 0x811c9dc5;
  for (const char of `${english}\u0000${translation}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

// One "key:stamp" a line for the form (some keys have spaces), and back.
// Browsers send a form's line breaks as \r\n.
export function stampsFor(lines: ReviewLine[]): string {
  return lines
    .map((l) => `${l.key}:${lineStamp(l.english, l.translation)}`)
    .join("\n");
}

export function parseStamps(text: string): Map<string, string> {
  const stamps = new Map<string, string>();
  for (const pair of text.split(/\r?\n/)) {
    const at = pair.lastIndexOf(":");
    if (at > 0) stamps.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return stamps;
}

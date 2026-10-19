import { MESSAGES, translator } from "@/lib/i18n";
import { pageLocale } from "@/lib/i18n/locale";
import { withLocale } from "@/lib/i18n/paths";

export { pageLocale, setPageLocale } from "@/lib/i18n/locale";

// The translations for the page being rendered.
export function pageT() {
  return translator(pageLocale());
}

// An address on the site in the page's language: "/mandirs" on English
// pages, "/gu/mandirs" on Gujarati ones, for pages that have a Gujarati
// version (lib/i18n/paths.ts).
export function localePath(path: string): string {
  return withLocale(path, pageLocale());
}

// A festival's name and summary come from the database in English; on
// Gujarati pages, the Gujarati from the translations when there is one.
export function festivalText(
  slug: string,
  english: { name: string; summary: string | null },
): { name: string; summary: string | null } {
  if (pageLocale() !== "gu") return english;
  const gu = MESSAGES.gu as Record<string, string | undefined>;
  return {
    name: gu[`festival.name.${slug}`] ?? english.name,
    summary: english.summary
      ? (gu[`festival.summary.${slug}`] ?? english.summary)
      : null,
  };
}

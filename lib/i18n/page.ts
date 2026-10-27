import { MESSAGES, type MessageKey, translator } from "@/lib/i18n";
import { pageLocale } from "@/lib/i18n/locale";
import { withLocale } from "@/lib/i18n/paths";
import type { Season } from "@/lib/seasons";

export { pageLocale, setPageLocale } from "@/lib/i18n/locale";

// The translations for the page being rendered.
export function pageT() {
  return translator(pageLocale());
}

// An address on the site in the page's language: "/mandirs" on English
// pages, "/gu/mandirs" on Gujarati ones and "/hi/mandirs" on Hindi ones,
// for pages that have translations (lib/i18n/paths.ts).
export function localePath(path: string): string {
  return withLocale(path, pageLocale());
}

// A festival's name and summary come from the database in English; on
// Gujarati and Hindi pages, the translation when there is one.
export function festivalText(
  slug: string,
  english: { name: string; summary: string | null },
): { name: string; summary: string | null } {
  const locale = pageLocale();
  if (locale === "en") return english;
  const messages = MESSAGES[locale] as Record<string, string | undefined>;
  return {
    name: messages[`festival.name.${slug}`] ?? english.name,
    summary: english.summary
      ? (messages[`festival.summary.${slug}`] ?? english.summary)
      : null,
  };
}

// A festival season's words (lib/seasons.ts) in the page's language. The
// English is kept in the translations too, so it can be checked alongside
// the Gujarati.
export function seasonText(season: Season): {
  name: string;
  period: string;
  title: string;
  description: string;
  intro: string;
  shareText: string;
} {
  const t = pageT();
  const key = (field: string) => `season.${season.slug}.${field}` as MessageKey;
  return {
    name: festivalText(season.main, { name: season.name, summary: null }).name,
    period: t(key("period")),
    title: t(key("title")),
    description: t(key("description")),
    intro: t(key("intro")),
    shareText: t(key("shareText")),
  };
}

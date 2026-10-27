import type { Locale } from "@/lib/i18n";

// Which pages have Gujarati and Hindi versions (at /gu/… and /hi/…), and
// the addresses between the languages. No translations here, so the
// browser's language switch can use it without loading them.

// The languages other than English, each with its own address prefix.
export const TRANSLATED_LOCALES = ["gu", "hi"] as const;

// The public pages that have them: families' pages, not committees' or
// admins'.
const TRANSLATED_PATHS = [
  /^\/$/,
  /^\/whats-on$/,
  /^\/seva$/,
  /^\/plan$/,
  /^\/my$/,
  /^\/mandirs(\/[^/]+(\/events\/[^/]+(\/seva)?)?(\/tell-us)?)?$/,
  /^\/festivals(\/[^/]+)?$/,
  // The festival season pages (lib/seasons.ts; a test checks they match).
  // And each in a town (/diwali/leicester).
  /^\/(maha-shivaratri|holi|ram-navami|janmashtami|ganesh-chaturthi|navratri|diwali)(\/[a-z0-9-]+)?$/,
];

export function hasTranslation(path: string): boolean {
  const bare = path.split(/[?#]/)[0];
  return TRANSLATED_PATHS.some((p) => p.test(bare));
}

// The language of an address: "gu" for /gu/…, "hi" for /hi/…, else "en".
export function localeOfPath(path: string): Locale {
  return (
    TRANSLATED_LOCALES.find(
      (l) => path === `/${l}` || path.startsWith(`/${l}/`),
    ) ?? "en"
  );
}

// The English address of a page in any language.
export function englishPath(path: string): string {
  const locale = localeOfPath(path);
  if (locale === "en") return path;
  return path.slice(locale.length + 1) || "/";
}

export function withLocale(path: string, locale: Locale): string {
  if (locale === "en" || !hasTranslation(path)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

// The same page in another language, for the language switch: that
// language's home page for pages that are only in English.
export function languagePath(path: string, locale: Locale): string {
  const english = englishPath(path);
  if (locale === "en" || hasTranslation(english)) {
    return withLocale(english, locale);
  }
  return `/${locale}`;
}

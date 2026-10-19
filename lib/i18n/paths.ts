import type { Locale } from "@/lib/i18n";

// Which pages have a Gujarati version at /gu/…, and the addresses between
// the two. No translations here, so the browser's language switch can use
// it without loading them.

// The public pages with a Gujarati version at /gu/…: families' pages, not
// committees' or admins'.
const GUJARATI_PATHS = [
  /^\/$/,
  /^\/whats-on$/,
  /^\/mandirs(\/[^/]+(\/events\/[^/]+(\/seva)?)?(\/tell-us)?)?$/,
  /^\/festivals(\/[^/]+)?$/,
  // The festival season pages (lib/seasons.ts; a test checks they match).
  /^\/(maha-shivaratri|holi|ram-navami|janmashtami|ganesh-chaturthi|navratri|diwali)$/,
];

export function hasGujarati(path: string): boolean {
  const bare = path.split(/[?#]/)[0];
  return GUJARATI_PATHS.some((p) => p.test(bare));
}

export function withLocale(path: string, locale: Locale): string {
  if (locale !== "gu" || !hasGujarati(path)) return path;
  return path === "/" ? "/gu" : `/gu${path}`;
}

// The English address of a Gujarati page, and the other way round, for
// the language switch.
export function otherLanguagePath(path: string): string {
  if (path === "/gu") return "/";
  if (path.startsWith("/gu/")) return path.slice(3);
  return withLocale(path, "gu");
}

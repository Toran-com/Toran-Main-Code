// Names and words used across the site, kept in one place so the brand can
// change without hunting through pages.
export const site = {
  name: "Toran",
  tagline: "What's on at mandirs near you",
  description:
    "Toran brings together events from mandirs across the UK in one place, with a simple seva rota for mandir committees.",
  locale: "en-GB",
} as const;

// Builds the browser tab title for a page, e.g. "Festivals · Toran".
export function pageTitle(page?: string): string {
  const name = page?.trim();
  return name ? `${name} · ${site.name}` : `${site.name} · ${site.tagline}`;
}

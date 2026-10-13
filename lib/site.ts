import type { Metadata } from "next";

// Names and words used across the site, kept in one place so the brand can
// change without hunting through pages.
export const site = {
  name: "Toran",
  tagline: "What's on at mandirs near you",
  description:
    "Toran brings together events from mandirs across the UK in one place, with a simple seva rota for mandir committees.",
  locale: "en-GB",
  // Until launch, ask search engines not to list any page, so half-finished
  // listings don't appear in search results. Set to true at launch.
  launched: false,
} as const;

// Builds the browser tab title for a page, e.g. "Festivals · Toran".
export function pageTitle(page?: string): string {
  const name = page?.trim();
  return name ? `${name} · ${site.name}` : `${site.name} · ${site.tagline}`;
}

// Title and description for the browser tab, search results and link
// previews. WhatsApp and Facebook read the "og:" copies.
export function pageMetadata(
  page?: string,
  description: string = site.description,
): Metadata {
  const title = pageTitle(page);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: site.name,
      locale: "en_GB",
      type: "website",
    },
  };
}

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
  // The privacy notice and terms (docs/legal) are drafts until the founders
  // and a solicitor have checked them; until then their pages say so. Set
  // to true once checked, and every [bracket] in them is filled in.
  legalChecked: false,
} as const;

// Toran's own email address, for questions and privacy requests. None yet:
// the contact page explains the other ways to reach Toran until there is.
export const CONTACT_EMAIL: string | null = null;

// The live site's address, for links that must be complete (the sitemap,
// search engine data). Vercel provides it; elsewhere it's this computer.
export function siteUrl(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

// Builds the browser tab title for a page, e.g. "Festivals · Toran".
export function pageTitle(page?: string): string {
  const name = page?.trim();
  return name ? `${name} · ${site.name}` : `${site.name} · ${site.tagline}`;
}

// Title and description for the browser tab, search results and link
// previews. WhatsApp and Facebook read the "og:" copies.
// `path` is the page's one true address (for example "/whats-on" whatever
// filters are chosen), so search engines don't treat copies as separate
// pages.
export function pageMetadata(
  page?: string,
  description: string = site.description,
  path?: string,
): Metadata {
  const title = pageTitle(page);
  return {
    title,
    description,
    ...(path && { alternates: { canonical: path } }),
    openGraph: {
      title,
      description,
      siteName: site.name,
      locale: "en_GB",
      type: "website",
      ...(path && { url: path }),
    },
  };
}

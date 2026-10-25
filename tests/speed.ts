import type { Page } from "@playwright/test";

// Counts only what the page itself downloads. Next.js fetches the pages
// that visible links lead to ahead of time (their data and code), so they
// open at once; whether that has finished when the page is weighed
// depends on timing, and it's those pages' cost, not this one's. Call
// before going to the page.
export async function ownDownloadsOnly(page: Page) {
  await page.route("**/*", (route) =>
    route.request().headers()["next-router-prefetch"]
      ? route.abort()
      : route.fallback(),
  );
}

// What a page cost to download, in kilobytes as sent over the network
// (compressed), once it has finished loading.
export async function pageWeight(page: Page) {
  await page.waitForLoadState("networkidle");
  return page.evaluate(() => {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const [nav] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const kb = (bytes: number) => Math.round(bytes / 1024);
    const js = resources
      .filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"))
      .reduce((sum, r) => sum + r.transferSize, 0);
    const all = resources.reduce((sum, r) => sum + r.transferSize, 0);
    return {
      js: kb(js),
      html: kb(nav.transferSize),
      total: kb(all + nav.transferSize),
    };
  });
}

// The speed budget, per page. Many visitors are on older phones and
// patchy mobile data, so pages must stay light. In October 2026 pages were
// about 220 KB of JavaScript and 300 KB in all; these leave a little room.
// If a change needs more, raise them in the same pull request and say why.
export const BUDGET = { js: 250, total: 350 };

// The mandirs map (/mandirs, map view) also downloads Leaflet and the map
// code, about 45 KB, only once the map is shown (decision 0011). The map
// pictures from OpenStreetMap load after the page, are cached by the
// browser and aren't counted here.
export const MAP_JS = 50;

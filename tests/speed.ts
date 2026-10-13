import type { Page } from "@playwright/test";

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

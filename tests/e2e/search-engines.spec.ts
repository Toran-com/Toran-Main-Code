import { expect, test, type Page } from "@playwright/test";

// What search engines read: each page's one true address, and the site's
// own description on the home page.

async function structuredData(page: Page) {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return scripts.map((text) => JSON.parse(text));
}

test("the home page describes the site", async ({ page }) => {
  await page.goto("/");
  const [site] = await structuredData(page);
  expect(
    site["@graph"].map((item: { "@type": string }) => item["@type"]),
  ).toEqual(["WebSite", "Organization"]);
});

test("pages name their one true address", async ({ page }) => {
  for (const [visit, canonical] of [
    ["/", /^https?:\/\/[^/]+\/?$/],
    ["/mandirs", /\/mandirs$/],
    ["/festivals", /\/festivals$/],
    ["/for-mandirs", /\/for-mandirs$/],
    // Filters don't make a separate page.
    ["/whats-on?near=LE4&within=15", /\/whats-on$/],
  ] as const) {
    await page.goto(visit);
    await expect(page.locator('link[rel="canonical"]'), visit).toHaveAttribute(
      "href",
      canonical,
    );
  }
});

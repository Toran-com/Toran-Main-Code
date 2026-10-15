import { expect, test, type Page } from "@playwright/test";

// With real data, mandir and festival pages describe themselves to search
// engines: the mandir as a place, and the trail of pages above them.

async function types(page: Page): Promise<string[]> {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return scripts.map((text) => JSON.parse(text)["@type"]);
}

test("a mandir's page describes the mandir and where it sits", async ({
  page,
}) => {
  await page.goto("/mandirs/geeta-bhavan-leicester");
  expect(await types(page)).toEqual(
    expect.arrayContaining(["HinduTemple", "BreadcrumbList"]),
  );
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const mandir = scripts
    .map((text) => JSON.parse(text))
    .find((data) => data["@type"] === "HinduTemple");
  expect(mandir).toMatchObject({
    name: "Geeta Bhavan Leicester",
    address: { addressLocality: "Leicester", postalCode: "LE2 3AD" },
  });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/mandirs\/geeta-bhavan-leicester$/,
  );
});

test("a festival's page shows where it sits", async ({ page }) => {
  await page.goto("/festivals");
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/festivals\/[a-z0-9-]+$/);
  expect(await types(page)).toContain("BreadcrumbList");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/festivals\/[a-z0-9-]+$/,
  );
});

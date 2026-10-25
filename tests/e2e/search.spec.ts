import { expect, test } from "@playwright/test";

// One search box, reached from every page's header. Without a database
// there's nothing to find, but the search itself works.

test("the header's search finds its way to results", async ({ page }) => {
  await page.goto("/festivals");
  await page.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Search");
  await page
    .getByLabel("Events, mandirs, towns or festivals")
    .fill("Diwali Leicester");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=Diwali\+Leicester$/);
  await expect(
    page.getByText(/Nothing found for “Diwali Leicester”/),
  ).toBeVisible();
});

test("search results aren't for search engines", async ({ page }) => {
  await page.goto("/search?q=diwali");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

import { expect, test } from "@playwright/test";

// One search box, reached from every page's header. Without a database
// there's nothing to find, but the search itself works.

test("the header's search finds its way to results", async ({ page }) => {
  await page.goto("/festivals");
  // On a phone of this size it's in the menu (the header makes room for
  // "Log in"); from 430px wide it's a magnifier in the header too.
  await page.locator("summary:visible", { hasText: "Menu" }).click();
  await page
    .getByRole("group", { name: "Menu" })
    .getByRole("link", { name: "Search" })
    .click();
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

test("results come as you type, without pressing Search", async ({ page }) => {
  await page.goto("/search");
  const box = page.getByLabel("Events, mandirs, towns or festivals");
  await box.pressSequentially("Holi Harrow", { delay: 40 });
  await expect(page).toHaveURL(/\/search\?q=Holi\+Harrow$/);
  await expect(page.getByText(/Nothing found for “Holi Harrow”/)).toBeVisible();
  // The box keeps what was typed while the results change under it.
  await expect(box).toHaveValue("Holi Harrow");
  await expect(box).toBeFocused();

  // Esc clears it and goes back to an empty search.
  await box.press("Escape");
  await expect(box).toHaveValue("");
  await expect(page).toHaveURL(/\/search$/);
});

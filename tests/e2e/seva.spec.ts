import { expect, test } from "@playwright/test";

// Seva is in the menu (and in the header on a laptop), and its page works
// before the database is connected.
test("the Seva page is in the menu", async ({ page }) => {
  await page.goto("/");
  await page.locator("summary", { hasText: "Menu" }).click();
  await page
    .getByRole("group", { name: "Menu" })
    .getByRole("link", { name: "Seva" })
    .click();
  await expect(page).toHaveURL(/\/seva$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seva");
  // How it works, folded away until wanted.
  await page.getByText("How it works", { exact: true }).click();
  await expect(
    page.getByText("No name needed. Your phone remembers your slots."),
  ).toBeVisible();
});

test("the Seva page has a Gujarati version", async ({ page }) => {
  await page.goto("/gu/seva");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("સેવા");
});

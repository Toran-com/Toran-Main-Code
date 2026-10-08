import { expect, test } from "@playwright/test";

test("home page shows the coming soon message", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Toran/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Toran");
  await expect(page.getByText("Coming soon")).toBeVisible();
});

test("text is at least 18px", async ({ page }) => {
  await page.goto("/");
  const size = await page
    .getByText("Events from mandirs")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

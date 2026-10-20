import { expect, test } from "@playwright/test";

test("home page shows the coming soon message", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Toran/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What's on at mandirs near you",
  );
  await expect(page.getByText("Coming soon")).toBeVisible();
  // The quick links go straight to What's on, filtered.
  await page
    .getByRole("navigation", { name: "Type of event" })
    .getByRole("link", { name: "Festival" })
    .click();
  await expect(page).toHaveURL(/\/whats-on\?type=festival$/);
});

test("text is at least 18px", async ({ page }) => {
  await page.goto("/");
  const size = await page
    .getByText("Events from mandirs")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

test("shared links get a preview picture", async ({ page, request }) => {
  await page.goto("/");
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toBeTruthy();
  const response = await request.get(new URL(image!).pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
});

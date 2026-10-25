import { expect, test } from "@playwright/test";

// The home page's "Coming up" starts near the place this phone chose on
// What's on (kept in the browser), by going to /?near=.

test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:3100",
        localStorage: [
          { name: "toran:place", value: '{"near":"LE4","within":60}' },
        ],
      },
    ],
  },
});

test("the home page starts near the saved place", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/\?near=LE4&within=60$/);
  await expect(page.getByRole("heading", { name: /^Coming up/ })).toBeVisible();
});

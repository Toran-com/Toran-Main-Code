import { expect, test } from "@playwright/test";

test("unknown pages show the Toran not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
  await expect(
    page.getByRole("link", { name: "Go to the Toran home page" }),
  ).toBeVisible();
});

test("the Sentry test route throws outside the live site", async ({
  request,
}) => {
  const response = await request.get("/api/debug/error");
  expect(response.status()).toBe(500);
});

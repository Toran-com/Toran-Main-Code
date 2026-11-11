import { expect, test } from "@playwright/test";

test("unknown pages show the Toran not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
  // Ways back into the site, not just the home page.
  await expect(
    page.getByRole("link", { name: "The Toran home page" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Find a mandir" }).click();
  await expect(page).toHaveURL(/\/mandirs$/);
});

test("the Sentry test route throws outside the live site", async ({
  request,
}) => {
  const response = await request.get("/api/debug/error");
  expect(response.status()).toBe(500);
});

test("login and not-found pages have the full header, with a way to log in", async ({
  page,
}) => {
  for (const path of ["/login", "/no-such-page"]) {
    await page.goto(path);
    await expect(
      page.getByRole("link", { name: "My Toran" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Log in", exact: true }),
    ).toBeVisible();
  }
  // "Log in" in the header, and in the menu.
  await page.goto("/");
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.locator("summary", { hasText: "Menu" }).click();
  await page.getByRole("link", { name: "Log in or create an account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in");
});

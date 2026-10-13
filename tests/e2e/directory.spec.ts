import { expect, test } from "@playwright/test";

// The test build has no database: the directory pages must say so plainly
// rather than crash, and unknown mandirs must be "not found".

test("the mandir list explains it isn't connected yet", async ({ page }) => {
  await page.goto("/mandirs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mandirs");
  await expect(page.getByText("isn't connected yet")).toBeVisible();
});

test("the festivals page explains it isn't connected yet", async ({ page }) => {
  await page.goto("/festivals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Festivals");
  await expect(page.getByText("isn't connected yet")).toBeVisible();
});

test("what's on explains it isn't connected yet", async ({ page }) => {
  await page.goto("/whats-on");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's on");
  await expect(page.getByText("isn't connected yet")).toBeVisible();
});

test("an unknown festival is not found", async ({ page }) => {
  const response = await page.goto("/festivals/no-such-festival");
  expect(response?.status()).toBe(404);
});

test("an unknown mandir is not found", async ({ page }) => {
  const response = await page.goto("/mandirs/no-such-mandir");
  expect(response?.status()).toBe(404);
});

test("the home page links to the directory", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse mandirs" }).click();
  await expect(page).toHaveURL(/\/mandirs$/);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Festivals" })
    .click();
  await expect(page).toHaveURL(/\/festivals$/);
});

test("pages ask search engines not to list them before launch", async ({
  page,
}) => {
  await page.goto("/mandirs");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

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

test("an event at an unknown mandir is not found", async ({ page }) => {
  const response = await page.goto(
    "/mandirs/no-such-mandir/events/00000000-0000-0000-0000-000000000000",
  );
  expect(response?.status()).toBe(404);
});

test("the seva rota of an event at an unknown mandir is not found", async ({
  page,
}) => {
  const response = await page.goto(
    "/mandirs/no-such-mandir/events/00000000-0000-0000-0000-000000000000/seva",
  );
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

test("before launch, robots.txt offers no sitemap and hides admin pages", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /ops");
  expect(robots).toContain("Disallow: /manage");
  expect(robots).not.toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("<url>");
});

test("the demo page works without a database", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("This is a sample.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shree Sample Mandir",
  );
  await expect(page.getByText("Reply here if you can help.")).toBeVisible();
});

test("an unknown mandir's print page is not found", async ({ page }) => {
  const response = await page.goto("/mandirs/no-such-mandir/print");
  expect(response?.status()).toBe(404);
});

test("telling us about an event at an unknown mandir is not found", async ({
  page,
}) => {
  const response = await page.goto("/mandirs/no-such-mandir/tell-us");
  expect(response?.status()).toBe(404);
});

test("the Diwali page explains it isn't connected yet", async ({ page }) => {
  await page.goto("/diwali");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diwali at UK mandirs",
  );
  await expect(page.getByText("isn't connected yet")).toBeVisible();
});

import { expect, test } from "@playwright/test";

// Every festival season has a page like Diwali's (lib/seasons.ts). Holi
// 2027 and Ram Navami 2027 are in the festival calendar, so their pages
// show the festival days; festival pages link to their season.

test("Holi has a page of its own", async ({ page, request }) => {
  await page.goto("/holi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Holi at UK mandirs",
  );
  await expect(
    page.getByRole("heading", { name: /^Holi is on .*22 Mar/ }),
  ).toBeVisible();
  // The night before is part of it.
  await expect(
    page.getByRole("link", { name: /^Holika Dahan/ }),
  ).toHaveAttribute("href", "/festivals/holika-dahan");

  const feed = await request.get("/holi/calendar.ics");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("X-WR-CALNAME:Holi at mandirs");

  await page.goto("/festivals/holika-dahan");
  await page.getByRole("link", { name: /All of Holi at mandirs/ }).click();
  await expect(page).toHaveURL(/\/holi$/);
});

test("Ram Navami and Hanuman Jayanti together", async ({ page }) => {
  await page.goto("/ram-navami");
  await expect(
    page.getByRole("heading", { name: /^Ram Navami is on .*15 Apr/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Hanuman Jayanti/ }),
  ).toHaveAttribute("href", "/festivals/hanuman-jayanti");
});

test("the festival dates page leads to every season page", async ({ page }) => {
  await page.goto("/festivals");
  const seasons = page.getByRole("region", {
    name: "Festival seasons at mandirs",
  });
  await expect(
    seasons.getByRole("link", { name: /^Holi at mandirs/ }),
  ).toHaveAttribute("href", "/holi");
  await seasons.getByRole("link", { name: /^Ram Navami at mandirs/ }).click();
  await expect(page).toHaveURL(/\/ram-navami$/);
});

test("each season has a page for each town with a mandir", async ({ page }) => {
  // Geeta Bhavan Leicester is in the directory, so Leicester has one,
  // whether or not anything is listed there yet.
  const response = await page.goto("/holi/leicester");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Holi in Leicester",
  );
  await expect(
    page.getByRole("heading", { name: /^Holi is on .*22 Mar/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Geeta Bhavan Leicester" }),
  ).toHaveAttribute("href", "/mandirs/geeta-bhavan-leicester");
  await page
    .getByRole("link", { name: /Holi across the UK/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/holi$/);

  // In Gujarati too; and a town without a mandir isn't a page.
  expect((await page.goto("/gu/holi/leicester"))?.status()).toBe(200);
  expect((await page.goto("/holi/no-mandirs-here"))?.status()).toBe(404);
});

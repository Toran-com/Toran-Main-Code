import { expect, test } from "@playwright/test";

// The Diwali page gathers Diwali week: the festival days from the
// festival calendar, a search near you, and a calendar to subscribe to.
// Which year's dates show depends on today, so check the shape.

test("Diwali week in one place", async ({ page, request }) => {
  await page.goto("/diwali");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diwali at UK mandirs",
  );
  const days = page.getByRole("heading", { name: /^Diwali is on / });
  const notYet = page.getByText("Next year's Diwali dates aren't listed yet");
  await expect(days.or(notYet)).toBeVisible();
  if (await days.isVisible()) {
    // Each festival day links to its own page.
    await expect(
      page.getByRole("link", { name: /^Dhanteras/ }),
    ).toHaveAttribute("href", "/festivals/dhanteras");
    await expect(page.getByLabel("Your postcode or area")).toBeVisible();
  }

  const feed = await request.get("/diwali/calendar.ics");
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  expect(await feed.text()).toContain("X-WR-CALNAME:Diwali at mandirs");

  // Diwali's own festival page points here.
  await page.goto("/festivals/diwali");
  await page
    .getByRole("link", { name: /All of Diwali week at mandirs/ })
    .click();
  await expect(page).toHaveURL(/\/diwali$/);
});

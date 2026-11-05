import { expect, test } from "@playwright/test";

// When a list has nothing in it, the page offers a way on rather than a
// dead end (components/empty.tsx).

test("What's on with nothing to show offers to show everything", async ({
  page,
}) => {
  // Youth events in Northern Ireland: none in the test data.
  await page.goto("/whats-on?type=youth&region=Northern+Ireland");
  await expect(
    page.getByText("No events listed there in the next eight weeks."),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Show every kind of event, any day" })
    .click();
  await expect(page).toHaveURL(/\/whats-on$/);
  await expect(page.locator("main article").first()).toBeVisible();
});

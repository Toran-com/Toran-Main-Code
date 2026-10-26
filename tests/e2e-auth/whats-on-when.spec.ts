import { expect, test } from "@playwright/test";

// "Today" and "This weekend" on What's on. Which events fall on those days
// depends on the date the tests run, so this checks the choices, not the
// list; the dates themselves are covered by tests/unit/whats-on-view.test.ts.

test("What's on can show just today or this weekend", async ({ page }) => {
  await page.goto("/whats-on?type=festival");
  const when = page.getByRole("navigation", { name: "When" });
  const weekend = when.getByRole("link", { name: "This weekend" });
  const today = when.getByRole("link", { name: "Today" });

  await weekend.click();
  await expect(page).toHaveURL(/when=weekend/);
  // The other choices stay.
  await expect(page).toHaveURL(/type=festival/);
  await expect(weekend).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/^\d+ events?$/)).toBeVisible();

  // One at a time.
  await today.click();
  await expect(page).toHaveURL(/when=today/);
  await expect(today).toHaveAttribute("aria-current", "page");
  await expect(weekend).not.toHaveAttribute("aria-current");

  // Choosing it again takes it off.
  await today.click();
  await expect(page).not.toHaveURL(/when=/);
  await expect(page).toHaveURL(/type=festival/);
});

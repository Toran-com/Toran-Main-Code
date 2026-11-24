import { expect, test } from "@playwright/test";

// Every mandir's page leads first-time visitors to the guide, in the
// page's language. Only reads a mandir's page.
test("a mandir's page links to the first-visit guide", async ({ page }) => {
  await page.goto("/mandirs/reading-hindu-temple");
  await page.getByRole("link", { name: /First time\? What to expect/ }).click();
  await expect(page).toHaveURL(/\/first-visit$/);
  await page.goto("/gu/mandirs/reading-hindu-temple");
  await page.getByRole("link", { name: /પહેલી વાર\?/ }).click();
  await expect(page).toHaveURL(/\/gu\/first-visit$/);
});

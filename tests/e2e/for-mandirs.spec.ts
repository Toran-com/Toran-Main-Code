import { expect, test } from "@playwright/test";

// The page for mandir committees, linked from every public page.
test("committees can find out what Toran does for them", async ({ page }) => {
  await page.goto("/mandirs");
  await page.getByRole("link", { name: "For mandir committees" }).click();
  await expect(page).toHaveURL(/\/for-mandirs$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "For mandir committees",
  );
  await expect(
    page.getByRole("link", { name: "Try the example" }),
  ).toHaveAttribute("href", "/demo");
});

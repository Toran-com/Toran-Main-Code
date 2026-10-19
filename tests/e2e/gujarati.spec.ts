import { expect, test } from "@playwright/test";

// The Gujarati pages (/gu/…) are a draft until a native speaker has
// checked them: they say so, aren't linked from the English pages, and ask
// search engines to leave them out.

test("the Gujarati pages are there, marked as a draft", async ({ page }) => {
  await page.goto("/gu");
  await expect(
    page.getByText("ગુજરાતી અનુવાદ હજી તપાસાઈ રહ્યો છે"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // The menu stays in Gujarati.
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "કાર્યક્રમો" }).click();
  await expect(page).toHaveURL(/\/gu\/whats-on$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "કાર્યક્રમો",
  );
  await expect(page.locator("[lang=gu]").first()).toBeVisible();
  await expect(page.getByText("હજી જોડાયેલ નથી")).toBeVisible();

  await page.goto("/gu/festivals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("તહેવારો");
  await page.goto("/gu/mandirs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("મંદિરો");
});

test("English pages don't offer Gujarati yet", async ({ page }) => {
  await page.goto("/whats-on");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's on");
  await expect(page.getByRole("link", { name: "ગુજરાતી" })).toHaveCount(0);
  await expect(page.getByText("ગુજરાતી અનુવાદ")).toHaveCount(0);
});

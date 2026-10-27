import { expect, test } from "@playwright/test";

// The Hindi pages (/hi/…), like the Gujarati ones, are a draft until a
// native speaker has checked them: they say so, aren't linked from the
// English pages, and ask search engines to leave them out.

test("the Hindi pages are there, marked as a draft", async ({ page }) => {
  await page.goto("/hi");
  await expect(
    page.getByText("हिन्दी अनुवाद अभी जाँचा जा रहा है"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // The menu stays in Hindi.
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "कार्यक्रम" }).click();
  await expect(page).toHaveURL(/\/hi\/whats-on$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("कार्यक्रम");
  await expect(page.locator("[lang=hi]").first()).toBeVisible();
  await expect(page.getByText("अभी जुड़ा नहीं है")).toBeVisible();

  await page.goto("/hi/festivals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("त्योहार");
  await page.goto("/hi/mandirs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("मंदिर");
  await page.goto("/hi/holi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "UK के मंदिरों में होली",
  );
});

test("a draft page links back to the same page in English", async ({
  page,
}) => {
  await page.goto("/hi/festivals");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/festivals$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Festivals");
});

test("English pages don't offer Hindi yet", async ({ page }) => {
  await page.goto("/whats-on");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's on");
  await expect(page.getByRole("link", { name: "हिन्दी" })).toHaveCount(0);
  await expect(page.getByText("हिन्दी अनुवाद")).toHaveCount(0);
});

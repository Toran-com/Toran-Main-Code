import { expect, test } from "@playwright/test";

// The Tamil pages (/ta/…), like the Gujarati and Hindi ones, are a draft
// until a native speaker has checked them: they say so, aren't linked
// from the English pages, and ask search engines to leave them out.

test("the Tamil pages are there, marked as a draft", async ({ page }) => {
  await page.goto("/ta");
  await expect(
    page.getByText("தமிழ் மொழிபெயர்ப்பு இன்னும் சரிபார்க்கப்படுகிறது"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // The menu stays in Tamil.
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "நிகழ்வு" }).click();
  await expect(page).toHaveURL(/\/ta\/whats-on$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "என்ன நடக்கிறது",
  );
  await expect(page.locator("[lang=ta]").first()).toBeVisible();

  await page.goto("/ta/festivals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "பண்டிகைகள்",
  );
  await page.goto("/ta/mandirs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("கோயில்கள்");
  await page.goto("/ta/diwali");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "UK கோயில்களில் தீபாவளி",
  );
});

test("a Tamil page links back to the same page in English", async ({
  page,
}) => {
  await page.goto("/ta/festivals");
  await page.locator("summary", { hasText: "பட்டி" }).click();
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/festivals$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Festivals");
});

test("English pages don't offer Tamil yet", async ({ page }) => {
  await page.goto("/whats-on");
  await expect(page.getByRole("link", { name: "தமிழ்" })).toHaveCount(0);
  await expect(page.getByText("தமிழ் மொழிபெயர்ப்பு")).toHaveCount(0);
});

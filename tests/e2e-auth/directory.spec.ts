import { expect, test } from "@playwright/test";

// The directory against a real local Supabase with the starting data
// (supabase/data/mandirs.csv and the festival dates migration).

test("the mandir list shows the starting directory", async ({ page }) => {
  await page.goto("/mandirs");
  await expect(page.getByText("106 mandirs")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "East Midlands" }),
  ).toBeVisible();
});

test("searching narrows the list", async ({ page }) => {
  await page.goto("/mandirs");
  await page.getByLabel("Find a mandir or town").fill("geeta leicester");
  await expect(page.getByText(/^\d+ of 106 mandirs$/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Geeta Bhavan Leicester/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /BAPS/ })).toHaveCount(0);

  await page.getByLabel("Find a mandir or town").fill("zzzz");
  await expect(page.getByText("No mandirs match")).toBeVisible();
});

test("a mandir page shows its details and an empty events list", async ({
  page,
}) => {
  await page.goto("/mandirs");
  await page.getByRole("link", { name: /Geeta Bhavan Leicester/ }).click();
  await expect(page).toHaveURL(/\/mandirs\/geeta-bhavan-leicester$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Geeta Bhavan Leicester",
  );
  await expect(page.getByText("Leicester, East Midlands")).toBeVisible();
  await expect(page.getByText("LE2 3AD")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "geetabhavanleicester.co.uk" }).first(),
  ).toBeVisible();
  await expect(page.getByText("No events listed yet.")).toBeVisible();
  await expect(page).toHaveTitle(/Geeta Bhavan Leicester, Leicester/);
});

test("upcoming festival dates show, marked not yet checked", async ({
  page,
}) => {
  await page.goto("/festivals");
  // Which festivals are upcoming depends on today's date, so check the
  // shape rather than a particular festival.
  const first = page.getByRole("article").first();
  await expect(first).toContainText(/\b(19|20)\d\d\b/);
  await expect(first).toContainText("Date not yet checked");
});

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
  await expect(first).toContainText(/(19|20)\d\d/);
  await expect(first).toContainText("Date not yet checked");
});

test("a festival card opens the festival's own page", async ({ page }) => {
  await page.goto("/festivals");
  const first = page.getByRole("article").first();
  const name = (await first.getByRole("link").first().textContent())?.trim();
  await first.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/festivals\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name!);
  await expect(page.getByText(/(19|20)\d\d/).first()).toBeVisible();
  await expect(page.getByText("Date not yet checked").first()).toBeVisible();
});

test("a mandir's print page has a QR code to its page", async ({ page }) => {
  await page.goto("/mandirs/geeta-bhavan-leicester");
  // No events yet, so nothing worth printing is offered.
  await expect(
    page.getByRole("link", { name: "Print for a noticeboard →" }),
  ).toHaveCount(0);

  await page.goto("/mandirs/geeta-bhavan-leicester/print");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Geeta Bhavan Leicester",
  );
  await expect(
    page.getByRole("img", {
      name: /^QR code for https?:\/\/.+\/mandirs\/geeta-bhavan-leicester$/,
    }),
  ).toBeVisible();
  await expect(page.getByText("No events are listed yet.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Print this page" }),
  ).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "../a11y";
import { BUDGET, MAP_JS, pageWeight } from "../speed";

// The map view of the mandir list. The test data has no map positions, so
// the list is the default and the map has no dots; the dots themselves are
// covered by tests/unit/map-clusters.test.ts. Map pictures are replaced
// with a blank image so the tests never call OpenStreetMap.

const blank = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function openMap(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ body: blank, contentType: "image/png" }),
  );
  await page.goto("/mandirs");
  await expect(
    page.getByRole("button", { name: "List", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Map", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: /Map of mandirs/ }),
  ).toBeVisible();
}

test("the mandirs can be shown on a map and back as a list", async ({
  page,
}) => {
  await openMap(page);
  await expect(
    page.getByText("None of these mandirs is on the map yet."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Near me" })).toBeEnabled();
  await expect(
    page.getByRole("heading", { level: 2, name: "East Midlands" }),
  ).toHaveCount(0);

  // The search box works on the map too.
  await page.getByLabel("Find a mandir or town").fill("geeta leicester");
  await expect(page.getByText(/^\d+ of 106 mandirs$/)).toBeVisible();

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Geeta Bhavan Leicester/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Map of mandirs/ }),
  ).toHaveCount(0);
});

test("the map view is accessible", async ({ page }) => {
  await openMap(page);
  await page.waitForLoadState("networkidle");
  await expectAccessible(page);
});

test("the map view stays within the speed budget", async ({ page }) => {
  await openMap(page);
  const weight = await pageWeight(page);
  expect(
    weight.js,
    "JavaScript on /mandirs, map view (KB)",
  ).toBeLessThanOrEqual(BUDGET.js + MAP_JS);
});

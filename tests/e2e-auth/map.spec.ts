import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "../a11y";
import { BUDGET, MAP_JS, ownDownloadsOnly, pageWeight } from "../speed";
import { showMandirList, stubMapTiles } from "./helpers";

// The map view of the mandir list. Which mandirs have map positions
// depends on what other tests saved, so these tests don't count dots; the
// dots themselves are covered by tests/unit/map-clusters.test.ts. Map
// pictures are stubbed so the tests never call OpenStreetMap.

async function openMap(page: Page) {
  await stubMapTiles(page);
  await page.goto("/mandirs");
  const map = page.getByRole("button", { name: "Map", exact: true });
  await map.click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: /Map of mandirs/ }),
  ).toBeVisible();
}

test("the mandirs can be shown on a map and back as a list", async ({
  page,
}) => {
  await openMap(page);
  await expect(page.getByRole("button", { name: "Near me" })).toBeEnabled();
  await expect(
    page.getByRole("heading", { level: 2, name: "East Midlands" }),
  ).toHaveCount(0);

  // The search box works on the map too, and carries over to the list.
  await page.getByLabel("Find a mandir or town").fill("geeta leicester");
  await expect(page.getByText(/^\d+ of 106 mandirs$/)).toBeVisible();

  await showMandirList(page);
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
  await ownDownloadsOnly(page);
  await openMap(page);
  const weight = await pageWeight(page);
  expect(
    weight.js,
    "JavaScript on /mandirs, map view (KB)",
  ).toBeLessThanOrEqual(BUDGET.js + MAP_JS);
});

import { expect, test } from "@playwright/test";

// Someone zooms a map and goes straight to another page. Leaflet finishes
// a zoom a quarter of a second after it starts, and used to do so on the
// map that had gone, throwing "_leaflet_pos" (Sentry, 15 November 2026;
// components/uk-map.ts, removeUkMap).
test("leaving a map in the middle of a zoom is quiet", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/whats-on?view=map");
  const zoomIn = page.locator(".leaflet-control-zoom-in").first();
  await zoomIn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  for (let i = 0; i < 3; i++) {
    await zoomIn.click();
    // Straight to another page, without reloading.
    await page.evaluate(() =>
      document
        .querySelector<HTMLAnchorElement>('a[href="/festivals"]')
        ?.click(),
    );
    await expect(page).toHaveURL(/\/festivals$/);
    await page.waitForTimeout(800);
    await page.goBack();
    await zoomIn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
  }
  expect(errors).toEqual([]);
});

// Next keeps a page alive while someone is elsewhere, then shows it again
// as it was. The maps are taken down when they're hidden, and must draw
// their candles again when they come back (Milan, 17 November 2026: going
// to another tab and back left the Mandirs map empty).
const tabs = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main" });

test("the Mandirs map draws its candles again after another tab", async ({
  page,
}) => {
  const candles = page.locator(
    ".toran-map .toran-dot, .toran-map .toran-cluster",
  );
  await page.goto("/mandirs");
  // Phones open on the list; the map is a tap away.
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(candles.first()).toBeAttached();
  for (let i = 0; i < 2; i++) {
    await tabs(page).getByRole("link", { name: "Festivals" }).click();
    await expect(page).toHaveURL(/\/festivals$/);
    await tabs(page).getByRole("link", { name: "Mandirs" }).click();
    await expect(page).toHaveURL(/\/mandirs$/);
    await expect(candles.first()).toBeAttached();
  }
});

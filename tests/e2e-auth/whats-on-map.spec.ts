import { expect, test, type Page } from "@playwright/test";
import { stubMapTiles } from "./helpers";

// What's on as a map. Which events and mandirs are on it depends on what
// other tests saved (mandir-admin.spec.ts adds events), so these tests
// don't count pins; the pins themselves are covered by
// tests/unit/whats-on-view.test.ts. Map pictures are stubbed so the tests
// never call OpenStreetMap. Accessibility and the speed budget for the
// map view are checked with the other pages (accessibility.spec.ts and
// speed.spec.ts).

async function openMap(page: Page) {
  await stubMapTiles(page);
  await page.goto("/whats-on");
  const map = page.getByRole("link", { name: "Map", exact: true });
  await map.click();
  await expect(page).toHaveURL(/view=map/);
  await expect(map).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("region", { name: "Map of events at mandirs" }),
  ).toBeVisible();
}

test("What's on can be shown on a map and back as a list", async ({ page }) => {
  await openMap(page);
  await expect(page.getByRole("article")).toHaveCount(0);

  // A pin opens its mandir's next events, each a link to its page (a
  // circle for several mandirs zooms in first).
  const pins = page.locator(".toran-need");
  await expect(
    pins.first().or(page.getByText("aren't on the map yet")),
  ).toBeVisible();
  if ((await pins.count()) > 0) {
    const link = page.locator(".toran-popup a").first();
    // From the keyboard: focus stays on the circle as it zooms in.
    await pins.first().focus();
    await expect(async () => {
      await page.keyboard.press("Enter");
      await expect(link).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(link).toHaveAttribute("href", /\/mandirs\/.+\/events\//);
  }

  // Choosing a type of event keeps the map.
  await page.getByText("Filter").click();
  await page.getByRole("link", { name: "Festival", exact: true }).click();
  await expect(page).toHaveURL(/type=festival/);
  await expect(page).toHaveURL(/view=map/);

  await page.getByRole("link", { name: "List", exact: true }).click();
  await expect(page).not.toHaveURL(/view=map/);
  await expect(page).toHaveURL(/type=festival/);
  await expect(
    page.getByRole("region", { name: "Map of events at mandirs" }),
  ).toHaveCount(0);
});

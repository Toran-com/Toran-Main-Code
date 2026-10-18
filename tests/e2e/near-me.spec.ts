import { expect, test } from "@playwright/test";

// What's on's "Near me": the browser's location becomes the nearest
// postcode district (looked up by the browser at postcodes.io, faked
// here), and the page shows events near it as if it had been typed. The
// visitor's other choices stay as they were.

test.describe("with location allowed", () => {
  test.use({
    permissions: ["geolocation"],
    geolocation: { latitude: 52.6619, longitude: -1.1235 },
  });

  test("near me searches the nearest district", async ({ page }) => {
    let asked = "";
    await page.route("https://api.postcodes.io/outcodes?**", async (route) => {
      asked = route.request().url();
      await route.fulfill({
        json: { status: 200, result: [{ outcode: "LE4" }] },
      });
    });
    await page.goto("/whats-on");
    await page.getByLabel("Within").selectOption("30");
    await page.getByRole("button", { name: "Near me" }).click();
    await expect(page).toHaveURL(/\/whats-on\?.*near=LE4/);
    expect(new URL(page.url()).searchParams.get("within")).toBe("30");
    await expect(page.getByLabel("Your postcode or area")).toHaveValue("LE4");
    // Only a rounded position went to postcodes.io; Toran got the district.
    expect(asked).toContain("lat=52.66&");
    expect(new URL(page.url()).search).not.toContain("52.66");
  });

  test("says so when there's no district nearby", async ({ page }) => {
    await page.route("https://api.postcodes.io/outcodes?**", (route) =>
      route.fulfill({ json: { status: 200, result: null } }),
    );
    await page.goto("/whats-on");
    await page.getByRole("button", { name: "Near me" }).click();
    await expect(
      page.getByText("We couldn't find your area just now."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/whats-on$/);
  });
});

test("says so when the browser won't share a location", async ({ page }) => {
  // As if the visitor pressed "Don't allow".
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "denied",
      } as GeolocationPositionError);
  });
  await page.goto("/whats-on");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(
    page.getByText("Your browser didn't share your location."),
  ).toBeVisible();
});

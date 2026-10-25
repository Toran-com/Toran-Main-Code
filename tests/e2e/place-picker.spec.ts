import { expect, test } from "@playwright/test";

// "Where are you?" on What's on: asked the first time, answered with the
// browser's location (turned into the nearest postcode district by the
// browser at postcodes.io, faked here), a postcode or all of the UK, and
// remembered on the phone.

test.use({ storageState: { cookies: [], origins: [] } });

test("asks on the first visit, and remembers a postcode", async ({ page }) => {
  await page.goto("/whats-on");
  const ask = page.getByRole("dialog", { name: "Where are you?" });
  await expect(ask).toBeVisible();
  await ask.getByLabel("Your postcode").fill("le4 6ar");
  await ask.getByLabel("Within").selectOption("30");
  await ask.getByRole("button", { name: "Show events" }).click();
  await expect(page).toHaveURL(/\/whats-on\?near=LE4\+6AR&within=30$/);
  await expect(ask).toBeHidden();

  // Next time, straight to the same place, without asking.
  await page.goto("/whats-on?type=festival");
  await expect(page).toHaveURL(/near=LE4\+6AR&within=30/);
  expect(new URL(page.url()).searchParams.get("type")).toBe("festival");
  await expect(ask).toBeHidden();
});

test("all of the UK isn't asked again", async ({ page }) => {
  await page.goto("/whats-on");
  const ask = page.getByRole("dialog", { name: "Where are you?" });
  await ask.getByRole("link", { name: "Show all of the UK" }).click();
  await expect(ask).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(ask).toBeHidden();
  await expect(page).toHaveURL(/\/whats-on$/);
  // It's still there when wanted.
  await page.getByRole("link", { name: "Find near me" }).click();
  await expect(ask).toBeVisible();
});

test("closing it counts as an answer", async ({ page }) => {
  await page.goto("/whats-on");
  const ask = page.getByRole("dialog", { name: "Where are you?" });
  await ask.getByRole("button", { name: "Close" }).click();
  await expect(ask).toBeHidden();
  await page.reload();
  await page.waitForTimeout(500);
  await expect(ask).toBeHidden();
});

test("a link can open it (?pick=1)", async ({ page }) => {
  await page.goto("/whats-on");
  const ask = page.getByRole("dialog", { name: "Where are you?" });
  await ask.getByRole("link", { name: "Show all of the UK" }).click();
  await page.goto("/whats-on?type=festival&pick=1");
  // It's in the page from the start, and becomes a pop-up (which Escape
  // closes) once the page has loaded.
  await expect(page.locator("dialog:modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ask).toBeHidden();
  await expect(page).toHaveURL(/\/whats-on\?type=festival$/);
});

test.describe("with location allowed", () => {
  test.use({
    permissions: ["geolocation"],
    geolocation: { latitude: 52.6619, longitude: -1.1235 },
  });

  test("uses the nearest district", async ({ page }) => {
    let asked = "";
    await page.route("https://api.postcodes.io/outcodes?**", async (route) => {
      asked = route.request().url();
      await route.fulfill({
        json: { status: 200, result: [{ outcode: "LE4" }] },
      });
    });
    await page.goto("/whats-on?type=festival");
    const ask = page.getByRole("dialog", { name: "Where are you?" });
    await ask.getByLabel("Within").selectOption("30");
    await ask.getByRole("button", { name: "Use my location" }).click();
    await expect(page).toHaveURL(/\/whats-on\?.*near=LE4/);
    const query = new URL(page.url()).searchParams;
    expect(query.get("within")).toBe("30");
    expect(query.get("type")).toBe("festival");
    // Only a rounded position went to postcodes.io; Toran got the district.
    expect(asked).toContain("lat=52.66&");
    expect(new URL(page.url()).search).not.toContain("52.66");
  });

  test("says so when there's no district nearby", async ({ page }) => {
    await page.route("https://api.postcodes.io/outcodes?**", (route) =>
      route.fulfill({ json: { status: 200, result: null } }),
    );
    await page.goto("/whats-on");
    await page.getByRole("button", { name: "Use my location" }).click();
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
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("Your browser didn't share your location."),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";

// The test build has no database, so login must say it isn't on yet and
// protected pages must send people to the login page, not crash.

test("login page explains login isn't switched on yet", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in");
  await expect(
    page.getByText("Logging in isn't switched on yet"),
  ).toBeVisible();
});

test("account page sends visitors to log in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("admin page sends visitors to log in", async ({ page }) => {
  await page.goto("/ops");
  await expect(page).toHaveURL(/\/login\?next=%2Fops/);
});

test("a login link that can't be used goes back to login", async ({
  request,
}) => {
  const response = await request.get(
    "/auth/confirm?code=bogus&next=//evil.example",
    {
      maxRedirects: 0,
    },
  );
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toMatch(
    /\/login\?error=link&next=%2Faccount$/,
  );
});

test("signing out only works by form post", async ({ request }) => {
  expect(
    (await request.get("/auth/signout", { maxRedirects: 0 })).status(),
  ).toBe(405);
  const post = await request.post("/auth/signout", { maxRedirects: 0 });
  expect(post.status()).toBe(303);
});

test("claiming and managing a mandir need a login", async ({ page }) => {
  await page.goto("/mandirs/some-mandir/claim");
  await expect(page).toHaveURL(
    /\/login\?next=%2Fmandirs%2Fsome-mandir%2Fclaim/,
  );
  await page.goto("/manage/some-mandir");
  await expect(page).toHaveURL(/\/login\?next=%2Fmanage%2Fsome-mandir/);
  await page.goto("/manage/some-mandir/seva/some-event");
  await expect(page).toHaveURL(
    /\/login\?next=%2Fmanage%2Fsome-mandir%2Fseva%2Fsome-event/,
  );
  await page.goto("/manage/some-mandir/events/some-event");
  await expect(page).toHaveURL(
    /\/login\?next=%2Fmanage%2Fsome-mandir%2Fevents%2Fsome-event/,
  );
  // Nor can its spreadsheet file be fetched without one.
  const file = await page.request.get(
    "/manage/some-mandir/numbers/export.csv",
    { maxRedirects: 0 },
  );
  expect(file.status()).toBe(307);
  expect(file.headers().location).toMatch(
    /\/login\?next=%2Fmanage%2Fsome-mandir%2Fnumbers/,
  );
});

test("the admin pages need a login", async ({ page }) => {
  for (const path of [
    "/ops/mandirs",
    "/ops/mandirs/new",
    "/ops/posters",
    "/ops/websites",
    "/ops/festivals",
    "/ops/digest",
    "/ops/translations",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=%2Fops/);
  }
});

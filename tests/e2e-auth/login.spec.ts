import { expect, test } from "@playwright/test";
import { latestLoginLink, logIn, sql, totp } from "./helpers";

// Runs against a real local Supabase (see the Database workflow): real login
// emails, real sessions, real second factor.

test("a committee member logs in by email link and out again", async ({
  page,
}) => {
  const email = `member-${Date.now()}@example.com`;
  await logIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("link", { name: "Toran admin" })).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("a login link only works once", async ({ page, browser }) => {
  const email = `once-${Date.now()}@example.com`;
  await logIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  const link = await latestLoginLink(email);
  const other = await browser.newPage();
  await other.goto(link);
  await expect(other).toHaveURL(/\/login\?error=link/);
  await other.close();
});

test("a non-admin can't see that the admin area exists", async ({ page }) => {
  await logIn(page, `nosy-${Date.now()}@example.com`, "/ops");
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

test("an admin must set up and use an authenticator app", async ({ page }) => {
  test.setTimeout(90_000);
  const email = `admin-${Date.now()}@example.com`;
  await logIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  sql(
    `insert into public.toran_admins (user_id, note) select id, 'e2e' from auth.users where email = '${email}'`,
  );

  await page.goto("/ops");
  await page
    .getByRole("button", { name: "Set up an authenticator app" })
    .click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();

  await page.getByLabel(/6-digit code/).fill("000000");
  await page.getByRole("button", { name: "Confirm and unlock admin" }).click();
  await expect(page.getByText("That code didn't match")).toBeVisible();

  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Confirm and unlock admin" }).click();
  await expect(page.getByText("Unlocked.")).toBeVisible();

  // A fresh login without the code must ask for it again. Codes can't be
  // reused, so wait for the next 30-second window first.
  await page.context().clearCookies();
  await logIn(page, email, "/ops");
  await expect(
    page.getByRole("button", { name: "Unlock admin" }),
  ).toBeVisible();
  await page.waitForTimeout(30_500 - (Date.now() % 30_000));
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Unlock admin" }).click();
  await expect(page.getByText("Unlocked.")).toBeVisible();
});

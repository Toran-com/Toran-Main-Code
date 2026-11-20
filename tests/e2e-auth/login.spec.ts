import { expect, test } from "@playwright/test";
import {
  followLoginLink,
  latestLoginCode,
  latestLoginLink,
  logIn,
  sql,
  totp,
} from "./helpers";

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
  await followLoginLink(other, link);
  await expect(other).toHaveURL(/\/login\?error=link/);
  await other.close();
});

// Email programs and their virus checkers often open links before the
// person does. Opening the link only shows a "Log in" button, so it still
// works when the person gets to it.
test("opening the link alone doesn't log in or use it up", async ({
  browser,
}) => {
  const email = `scanned-${Date.now()}@example.com`;
  const page = await browser.newPage();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  const link = await latestLoginLink(email);

  const scanner = await browser.newPage();
  await scanner.goto(link);
  await expect(scanner).toHaveURL(/\/login\/confirm\?/);
  await scanner.goto("/account");
  await expect(scanner).toHaveURL(/\/login\?next=%2Faccount/);
  await scanner.close();

  await followLoginLink(page, link);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  await page.close();
});

// A double tap, or a press while the page is still loading, sends the
// form twice; the second finds the link used. They're logged in all the
// same, and stay on the page they were going to.
test("pressing Log in twice still logs in", async ({ page }) => {
  const email = `twice-${Date.now()}@example.com`;
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await page.goto(await latestLoginLink(email));
  const button = page.getByRole("button", { name: "Log in", exact: true });
  await expect(button).toBeVisible();
  await page
    .locator("form", { has: button })
    .evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
      form.requestSubmit();
    });
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  // Nothing comes along afterwards to say the link didn't work.
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/account$/);
});

test("the code in the email logs in too", async ({ page }) => {
  const email = `code-${Date.now()}@example.com`;
  await page.goto("/login?next=%2Faccount");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  const code = await latestLoginCode(email);
  const box = page.getByLabel("Or type the code from the email");
  // A wrong code is turned back.
  await box.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Log in with the code" }).click();
  await expect(page.getByText("That code didn't work.")).toBeVisible();
  await page.getByLabel("Or type the code from the email").fill(code);
  await page.getByRole("button", { name: "Log in with the code" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
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

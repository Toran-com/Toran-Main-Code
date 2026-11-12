import { expect, test } from "@playwright/test";
import { latestLoginLink, sql } from "./helpers";

// "Log in" on every page, and the two doors it opens (decision 0020).
// Family accounts are switched on for this test build only
// (NEXT_PUBLIC_FAMILY_ACCOUNTS in .github/workflows/database.yml); the
// live site keeps them off until the ICO registration and DPIA are done.
const FAMILY = process.env.NEXT_PUBLIC_FAMILY_ACCOUNTS === "on";
const SLUG = "geeta-bhavan-leicester";

test("Log in in the header opens a door for families and one for mandirs", async ({
  page,
}) => {
  await page.goto("/festivals");
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Your mandirs and your plan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Put your mandir's events on Toran" }),
  ).toBeVisible();
  // Creating a mandir's account comes first on its door.
  await page
    .getByRole("link", { name: "Create your mandir's account, free" })
    .click();
  await expect(page).toHaveURL(/\/join$/);
});

test("a family's mandirs and plan follow them to another device", async ({
  browser,
}) => {
  test.skip(!FAMILY, "family accounts are off in this build");
  test.setTimeout(120_000);
  const email = `family-${Date.now()}@example.com`;

  // On the phone: follow a mandir without an account, then log in from
  // the family door.
  const phone = await browser.newPage();
  await phone.goto(`/mandirs/${SLUG}`);
  await phone.getByRole("button", { name: "Follow", exact: true }).click();
  await phone.goto("/login");
  await phone.getByLabel("Your email").fill(email);
  await phone.getByRole("button", { name: "Email me a link" }).click();
  await expect(phone.getByText("Check your email")).toBeVisible();
  await phone.goto(await latestLoginLink(email));
  await expect(phone).toHaveURL(/\/my$/);
  // Nothing goes on the account until the family agrees, with a box of
  // its own that starts unticked.
  const agree = phone.getByLabel(/I agree to Toran keeping the mandirs/);
  await expect(agree).not.toBeChecked();
  await phone.getByRole("button", { name: "Save to my account" }).click();
  await expect(agree).toBeVisible();
  expect(
    sql(`select count(*) from public.family_saved s
      join auth.users u on u.id = s.user_id where u.email = '${email}'`),
  ).toBe("0");
  await agree.check();
  await phone.getByRole("button", { name: "Save to my account" }).click();
  await expect(
    phone.getByText("Saved to your account, on every device"),
  ).toBeVisible();
  // The account now holds it, and when they agreed.
  await expect
    .poll(() =>
      sql(`select array_to_string(following, ',') from public.family_saved s
        join auth.users u on u.id = s.user_id where u.email = '${email}'`),
    )
    .toBe(SLUG);
  expect(
    sql(`select consented_at > now() - interval '5 minutes' from public.family_saved s
      join auth.users u on u.id = s.user_id where u.email = '${email}'`),
  ).toBe("t");

  // On a laptop, logging in brings it across. (Wait for the second
  // email: the first link has been used.)
  const first = await latestLoginLink(email);
  const laptop = await browser.newPage();
  await laptop.goto("/login");
  await laptop.getByLabel("Your email").fill(email);
  await laptop.getByRole("button", { name: "Email me a link" }).click();
  await expect(laptop.getByText("Check your email")).toBeVisible();
  let second = first;
  await expect
    .poll(async () => (second = await latestLoginLink(email)), {
      timeout: 20_000,
    })
    .not.toBe(first);
  await laptop.goto(second);
  await expect(laptop).toHaveURL(/\/my$/);
  // Agreed already, so no need to ask again.
  await expect(
    laptop.getByText("Saved to your account, on every device"),
  ).toBeVisible();
  await expect(laptop.getByLabel(/I agree to Toran keeping/)).toHaveCount(0);
  await laptop.goto(`/mandirs/${SLUG}`);
  const following = laptop.getByRole("button", { name: "Following" });
  await expect(following).toBeVisible();
  // Unfollowed on the laptop: gone from the phone too.
  await following.click();
  await expect
    .poll(() =>
      sql(`select cardinality(following) from public.family_saved s
        join auth.users u on u.id = s.user_id where u.email = '${email}'`),
    )
    .toBe("0");
  await phone.goto(`/mandirs/${SLUG}`);
  await expect(
    phone.getByRole("button", { name: "Follow", exact: true }),
  ).toBeVisible();

  // The account page says what's saved, and the family can close it.
  await phone.goto("/account");
  await expect(
    phone.getByRole("heading", { name: "Saved for your family" }),
  ).toBeVisible();
  await expect(phone.getByText(/You agreed to this on/)).toBeVisible();
  await phone.getByLabel(/I'm sure: close my account/).check();
  await phone.getByRole("button", { name: "Close my account" }).click();
  await expect(phone).toHaveURL(/\/login\?closed=1$/);
  await expect(phone.getByText("Your account is closed")).toBeVisible();
  expect(sql(`select count(*) from auth.users where email = '${email}'`)).toBe(
    "0",
  );
  await phone.close();
  await laptop.close();
});

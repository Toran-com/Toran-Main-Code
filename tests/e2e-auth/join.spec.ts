import { expect, test } from "@playwright/test";
import { latestLoginLink, sql } from "./helpers";

// Creating a committee account: log in, choose your mandir by searching,
// and ask to look after its page. Uses a mandir no other test looks at.
const SLUG = "hindu-temple-society-coventry";

test("a new committee member finds their mandir and asks to look after it", async ({
  page,
}) => {
  const email = `join-${Date.now()}@example.com`;
  await page.goto("/for-mandirs");
  await page
    .getByRole("link", { name: /^Create an account/ })
    .first()
    .click();
  await page.getByLabel("Your email address").fill(email);
  await page
    .getByRole("button", { name: "Email me a link to carry on" })
    .click();
  await expect(page).toHaveURL(/\/join\?sent=1/);
  await expect(page.getByText("Check your email.")).toBeVisible();
  // The link in the email creates the account and carries on.
  await page.goto(await latestLoginLink(email));
  await expect(page).toHaveURL(/\/join\/mandir$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Choose your mandir",
  );

  await page.getByLabel("Mandir or town").fill("Coventry");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page).toHaveURL(/q=Coventry/);
  await page
    .getByRole("link", {
      name: "This is my mandir: Hindu Temple Society, Coventry",
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/mandirs/${SLUG}/claim$`));

  await page.getByLabel("Your role at the mandir").fill("Secretary");
  await page.getByLabel(/I'm on this mandir's committee/).check();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByText(/We've got your request for Hindu Temple Society, Coventry/),
  ).toBeVisible();

  // Back at "Choose your mandir", it says the request is being checked,
  // and the mandir can't be asked for twice.
  await page.goto("/join/mandir?q=Coventry");
  await expect(
    page.getByText(/We're checking your request for Hindu Temple Society/),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Hindu Temple Society" })
      .getByText("Already yours"),
  ).toBeVisible();

  // Logged in, "Create an account" goes straight to choosing a mandir.
  await page.goto("/join");
  await page.getByRole("link", { name: "Choose your mandir" }).click();
  await expect(page).toHaveURL(/\/join\/mandir$/);

  sql(`delete from public.mandir_claims
    where user_id = (select id from auth.users where email = '${email}')`);
});

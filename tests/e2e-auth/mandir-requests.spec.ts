import { expect, test } from "@playwright/test";
import { logIn, mandirSetting, sql } from "./helpers";

// A committee lists what families can ask for (a puja, the hall); its
// page then offers "Ask about a puja or booking", and the form checks what
// a family sends. Sending needs the email service, which the tests don't
// have, so the form says it couldn't be sent. Uses a mandir no other test
// looks at.
const SLUG = "highgate-hill-murugan-temple-archway";

function nextMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 30 * 86_400_000));
}

test("a committee takes requests, and a family asks about the hall", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const email = `requests-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `update public.mandirs set status = 'claimed' where slug = '${SLUG}';
     insert into public.mandir_admins (mandir_id, user_id, consented_at)
       select m.id, u.id, now() from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing`,
  );

  // Nothing to ask for yet: no button, and no request page.
  const family = await browser.newPage();
  await family.goto(`/mandirs/${SLUG}`);
  await expect(
    family.getByRole("link", { name: "Ask about a puja or booking" }),
  ).toHaveCount(0);
  const missing = await family.goto(`/mandirs/${SLUG}/request`);
  expect(missing?.status()).toBe(404);

  // The committee lists what it offers.
  await page.goto(`/manage/${SLUG}`);
  await mandirSetting(page, "Details");
  await page
    .getByLabel("Requests families can send")
    .fill("Abhishekam\nHall hire\nhall hire\nNaming ceremony");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved. Your public page")).toBeVisible();
  expect(
    sql(`select array_to_string(request_types, ',') from public.mandirs
           where slug = '${SLUG}'`),
  ).toBe("Abhishekam,Hall hire,Naming ceremony");

  // Families see it on the page.
  await family.goto(`/mandirs/${SLUG}`);
  const card = family.getByRole("region", { name: "Pujas and bookings" });
  await expect(card).toContainText("Hall hire");
  await card.getByRole("link", { name: "Ask about a puja or booking" }).click();
  await expect(family).toHaveURL(new RegExp(`/mandirs/${SLUG}/request$`));
  await expect(
    family.getByRole("heading", { name: /^Ask Highgate Hill Murugan Temple/ }),
  ).toBeVisible();

  // It needs a way to reply.
  await family
    .getByLabel("What would you like to ask about?")
    .selectOption("Hall hire");
  await family.getByLabel("Preferred date (optional)").fill(nextMonth());
  await family.getByLabel("Your name").fill("Asha Patel");
  await family
    .getByLabel("Anything else they should know (optional)")
    .fill("About 80 guests, for a birthday.");
  await family.getByRole("button", { name: "Send to the committee" }).click();
  await expect(
    family.getByText("Please give an email or a phone number"),
  ).toBeVisible();

  // With one, it would go to the committee; here there's no email service.
  await family.getByLabel("Your name").fill("Asha Patel");
  await family
    .getByLabel("What would you like to ask about?")
    .selectOption("Hall hire");
  await family.getByLabel("Your email").fill("asha@example.com");
  await family.getByRole("button", { name: "Send to the committee" }).click();
  await expect(
    family.getByText("That couldn't be sent just now"),
  ).toBeVisible();
  await family.close();
});

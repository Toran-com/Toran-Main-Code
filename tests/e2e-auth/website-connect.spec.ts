import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// "Connect your website" (decision 0032), as far as it can go without
// reaching a real website: a wrong address or a calendar's is explained;
// a connected website shows how it went, takes its two choices, offers
// help when nothing could be read, and can be stopped. (Tests can't
// reach a real website: Toran never reads addresses on this machine.)
// Uses a mandir no other test looks at.
const SLUG = "bhaktivedanta-manor-iskcon-watford";

async function openConnect(page: import("@playwright/test").Page) {
  await page.goto(`/manage/${SLUG}`);
  await page.getByRole("button", { name: "Add events", exact: true }).click();
  await page.getByRole("button", { name: /^Connect your website/ }).click();
  return page.locator("dialog[open]");
}

test("a committee connects its website with one button", async ({ page }) => {
  const email = `connect-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
  sql(`update public.mandirs set status = 'claimed' where slug = '${SLUG}'`);
  sql(
    `delete from public.website_connections where mandir_id = (select id from public.mandirs where slug = '${SLUG}')`,
  );

  let sheet = await openConnect(page);
  await expect(
    sheet.getByRole("button", { name: "Connect my website" }),
  ).toBeVisible();

  // A calendar's address belongs under "Your calendar".
  await sheet
    .getByLabel("Your website", { exact: true })
    .fill("https://calendar.google.com/calendar/ical/x/public/basic.ics");
  await sheet.getByRole("button", { name: "Connect my website" }).click();
  await expect(sheet.getByText("That's a calendar's address")).toBeVisible();

  // An address Toran can't open isn't saved.
  await sheet
    .getByLabel("Your website", { exact: true })
    .fill("http://127.0.0.1:9/");
  await sheet.getByRole("button", { name: "Connect my website" }).click();
  await expect(
    sheet.getByText("Toran couldn't open that website"),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.website_connections where mandir_id = (select id from public.mandirs where slug = '${SLUG}')`,
    ),
  ).toBe("0");

  // Connected (as after a read that found nothing): how it went, and help.
  sql(
    `insert into public.website_connections (mandir_id, website, connected_by, last_checked_at, last_outcome, last_found, last_posters)
       select m.id, 'https://www.example.org/', u.id, now(), 'none', 0, 0
       from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
  sheet = await openConnect(page);
  await expect(sheet.getByTestId("website-connected")).toContainText(
    "Connected to example.org",
  );
  await expect(sheet.getByText("no events Toran can read yet")).toBeVisible();
  await sheet.getByRole("button", { name: "Ask Toran to help" }).click();
  await expect(
    page.getByText("Toran's team will be in touch").first(),
  ).toBeVisible();
  expect(
    sql(
      `select help_asked_at is not null from public.website_connections where mandir_id = (select id from public.mandirs where slug = '${SLUG}')`,
    ),
  ).toBe("t");

  // Its choice to check events first is kept.
  sheet = page.locator("dialog[open]");
  await sheet
    .getByLabel(/Put the events your website lists on Toran straight away/)
    .first()
    .uncheck();
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  expect(
    sql(
      `select auto_publish from public.website_connections where mandir_id = (select id from public.mandirs where slug = '${SLUG}')`,
    ),
  ).toBe("f");

  // And it can be stopped.
  sheet = page.locator("dialog[open]");
  await sheet.getByRole("button", { name: "Stop reading my website" }).click();
  await expect(
    page.getByText("Toran won't read your website any more"),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.website_connections where mandir_id = (select id from public.mandirs where slug = '${SLUG}')`,
    ),
  ).toBe("0");
});

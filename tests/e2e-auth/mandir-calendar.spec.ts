import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee gives Toran its events calendar: it's kept privately, shown
// back without its secret part, and can be taken away again. Uses a
// mandir no other test looks at.
const SLUG = "oxford-hindu-temple-and-community-centre";
const SECRET =
  "https://calendar.google.com/calendar/ical/oxford%40group.calendar.google.com/private-0a1b2c3d4e/basic.ics";

test("a committee adds, sees and removes its events calendar", async ({
  page,
}) => {
  const email = `calendar-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );

  await page.goto(`/manage/${SLUG}#calendar`);
  // Something that isn't an address.
  await page.getByLabel("Calendar address").fill("our calendar");
  await page.getByRole("button", { name: "Save calendar" }).click();
  await expect(
    page.getByText(/doesn't look like a calendar address/),
  ).toBeVisible();

  // A webcal link works, and the secret part is never shown.
  await page
    .getByLabel("Calendar address")
    .fill(SECRET.replace("https://", "webcal://"));
  await page.getByRole("button", { name: "Save calendar" }).click();
  await expect(
    page.getByText(/Toran reads your calendar tonight/),
  ).toBeVisible();
  await expect(
    page.getByText("Reading: Google Calendar (secret address)"),
  ).toBeVisible();
  await expect(
    page.getByText("Not read yet: Toran reads it tonight."),
  ).toBeVisible();
  expect(await page.content()).not.toContain("private-0a1b2c3d4e");
  expect(
    sql(
      `select url from public.mandir_calendars c join public.mandirs m on m.id = c.mandir_id
         where m.slug = '${SLUG}'`,
    ),
  ).toBe(SECRET);

  // Nowhere on the public page.
  await page.goto(`/mandirs/${SLUG}`);
  expect(await page.content()).not.toContain("private-0a1b2c3d4e");

  await page.goto(`/manage/${SLUG}#calendar`);
  await page.getByRole("button", { name: "Stop reading it" }).click();
  await expect(
    page.getByText("Toran won't read your calendar any more."),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.mandir_calendars c join public.mandirs m on m.id = c.mandir_id
         where m.slug = '${SLUG}'`,
    ),
  ).toBe("0");
});

import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee fills its page quickly: ticks a festival coming up, brings
// back last year's event on this year's date, and duplicates an event.
// Uses a mandir and a festival no other test looks at.
const SLUG = "ipswich-hindu-samaj";

// A London date some days from today, as the date input wants it.
function inDays(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + days * 86_400_000));
}

test("tick festivals, bring back last year's events, duplicate", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `quick-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );

  // A festival last year and in three weeks, and the evening-before
  // bhajans the mandir held last year.
  sql(`delete from public.festivals where slug = 'e2e-utsav'`);
  sql(
    `with f as (
       insert into public.festivals (slug, name) values ('e2e-utsav', 'Test Utsav')
       returning id
     ), d as (
       insert into public.festival_dates (festival_id, starts_on, ends_on, source)
       select id, day, day, 'e2e' from f,
         (values (current_date - 345), (current_date + 21)) as v (day)
       returning id, starts_on
     )
     insert into public.events (mandir_id, title, kind, starts_at, status, festival_date_id)
     select m.id, 'Utsav eve bhajans', 'bhajan',
       ((d.starts_on - 1)::timestamp + time '19:00') at time zone 'Europe/London',
       'published', d.id
     from public.mandirs m, d
     where m.slug = '${SLUG}' and d.starts_on < current_date`,
  );

  await page.goto(`/manage/${SLUG}`);

  // The festival, with a start time, in one go.
  await page.getByRole("checkbox", { name: /^Test Utsav/ }).check();
  await page.getByLabel("Time for Test Utsav").fill("18:00");
  await page.getByRole("button", { name: "Add the ticked festivals" }).click();
  await expect(page.getByText("Added.")).toBeVisible();
  const added = page
    .getByRole("listitem")
    .filter({ hasText: "Test Utsav" })
    .filter({ has: page.getByRole("link", { name: "Edit" }) });
  await expect(added).toContainText("6pm");
  // Not offered again.
  await expect(page.getByRole("checkbox", { name: /^Test Utsav/ })).toHaveCount(
    0,
  );

  // Last year's bhajans, the evening before this year's festival.
  const again = page.getByRole("checkbox", { name: /^Utsav eve bhajans/ });
  await expect(again).toBeVisible();
  await expect(page.getByLabel("Day for Utsav eve bhajans")).toHaveValue(
    inDays(20),
  );
  await expect(page.getByLabel("Time for Utsav eve bhajans")).toHaveValue(
    "19:00",
  );
  await again.check();
  await page.getByRole("button", { name: "Add the ticked events" }).click();
  await expect(page.getByText("Added.")).toBeVisible();
  const bhajans = page
    .getByRole("listitem")
    .filter({ hasText: "Utsav eve bhajans" })
    .filter({ has: page.getByRole("link", { name: "Edit" }) });
  await expect(bhajans).toHaveCount(1);
  await expect(bhajans).toContainText("7pm");

  // Duplicate it for another evening.
  await bhajans.getByRole("link", { name: "Duplicate" }).click();
  await expect(
    page.getByRole("heading", { name: /Add a copy of .Utsav eve bhajans./ }),
  ).toBeVisible();
  await expect(page.getByLabel("What's happening?")).toHaveValue(
    "Utsav eve bhajans",
  );
  await expect(page.getByLabel("What kind of event?")).toHaveValue("bhajan");
  await expect(page.getByLabel("Starts")).toHaveValue("19:00");
  await page.getByLabel("Date").fill(inDays(27));
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Added.")).toBeVisible();
  await expect(bhajans).toHaveCount(2);

  // On the public page too.
  await page.goto(`/mandirs/${SLUG}`);
  await expect(page.getByText("Test Utsav").first()).toBeVisible();
  await expect(page.getByText("Utsav eve bhajans").first()).toBeVisible();

  sql(`delete from public.festivals where slug = 'e2e-utsav'`);
});

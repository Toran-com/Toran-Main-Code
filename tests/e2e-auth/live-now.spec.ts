import { expect, test } from "@playwright/test";
import { logIn, mandirSetting, sql } from "./helpers";

// Live now: an event that's on at a mandir shows under "Happening now",
// with "Watch live" when the mandir has a stream, and on the home page.
// Uses a mandir no other test looks at.
const SLUG = "hindu-cultural-society-barnet";

test("what's on now shows on Live now and the home page", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const email = `live-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id, consented_at)
       select m.id, u.id, now() from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing;
     insert into public.events (mandir_id, title, starts_at, ends_at, status)
       select id, 'Live now test kirtan', now() - interval '10 minutes',
              now() + interval '50 minutes', 'published'
       from public.mandirs where slug = '${SLUG}'`,
  );

  // The committee adds its stream (saving refreshes the lists).
  await page.goto(`/manage/${SLUG}`);
  const sheet = await mandirSetting(page, "Details");
  await sheet
    .getByLabel("YouTube / Livestream")
    .fill("www.youtube.com/@barnet-test/live");
  await sheet.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved. Your public page")).toBeVisible();

  const family = await browser.newPage();
  await family.goto("/live");
  await expect(
    family.getByRole("heading", { name: "Live now", level: 1 }),
  ).toBeVisible();
  const now = family.getByRole("region", { name: "Happening now" });
  const row = now.getByRole("listitem").filter({
    hasText: "Live now test kirtan",
  });
  await expect(row).toContainText("Hindu Cultural Society Barnet");
  await expect(row).toContainText(/Started \d/);
  await expect(row.getByRole("link", { name: "Watch live" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/@barnet-test/live",
  );
  await row.getByRole("link", { name: /Live now test kirtan/ }).click();
  await expect(family).toHaveURL(new RegExp(`/mandirs/${SLUG}/events/`));

  // The home page says something's on, and leads to Live now.
  await family.goto("/");
  const strip = family.getByRole("link", { name: /Happening now/ });
  await expect(strip).toBeVisible();
  await strip.click();
  await expect(family).toHaveURL(/\/live$/);

  // In Gujarati too.
  await family.goto("/gu/live");
  await expect(
    family.getByRole("heading", { name: "અત્યારે ચાલી રહ્યું છે" }),
  ).toBeVisible();
  await family.close();

  // Tidy up, so other tests' home page has nothing on.
  sql(
    `delete from public.events where title = 'Live now test kirtan';
     update public.mandirs set live_url = null where slug = '${SLUG}'`,
  );
  await page.goto(`/manage/${SLUG}`);
  const again = await mandirSetting(page, "Details");
  await again.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved. Your public page")).toBeVisible();
});

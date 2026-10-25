import { expect, test } from "@playwright/test";
import { expectAccessible } from "../a11y";
import {
  logIn,
  logInAsAdmin,
  showMandirList,
  sql,
  stubMapTiles,
} from "./helpers";

// Every kind of page, with real data, meets WCAG 2.2 AA in light and dark
// mode: public pages, a committee's pages and the admin area.

test("public pages are accessible", async ({ page }) => {
  test.setTimeout(90_000);
  await stubMapTiles(page);
  for (const path of [
    "/mandirs",
    "/mandirs/geeta-bhavan-leicester",
    "/mandirs/geeta-bhavan-leicester/claim",
    "/mandirs/geeta-bhavan-leicester/tell-us",
    "/mandirs/geeta-bhavan-leicester/print",
    "/festivals",
    "/whats-on",
    "/whats-on?near=ZZ99&within=15",
    "/whats-on?type=festival&region=London",
    "/whats-on?pick=1",
    "/diwali",
    "/login",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
  }
  // The mandirs as a list as well as on the map.
  await page.goto("/mandirs");
  await showMandirList(page);
  await expectAccessible(page);
  // What's on's filters, open.
  await page.goto("/whats-on");
  await page.locator("summary", { hasText: "Filter" }).click();
  await expectAccessible(page);
  // A festival's own page.
  await page.goto("/festivals");
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/festivals\/[a-z0-9-]+$/);
  await expectAccessible(page);
});

test("a committee's pages are accessible", async ({ page }) => {
  test.setTimeout(90_000);
  const slug = "bedford-hindu-temple-and-community-trust";
  const email = `a11y-committee-${Date.now()}@example.com`;
  await logIn(page, email);
  await expectAccessible(page);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${slug}' and u.email = '${email}'`,
  );
  const event = sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, 'Accessibility check', now() + interval '3 days', 'published'
       from public.mandirs where slug = '${slug}'
       returning id`,
  );
  await page.goto(`/manage/${slug}`);
  await expect(
    page.getByText("Accessibility check", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.goto(`/manage/${slug}/seva/${event}`);
  await expectAccessible(page);
  await page.goto(`/manage/${slug}/events/${event}`);
  await expectAccessible(page);
  // Give it a seva rota open for volunteers (before its pages are first
  // seen, as they are saved).
  sql(
    `with role as (
       insert into public.seva_roles (event_id, name)
         values ('${event}', 'Kitchen') returning id)
     insert into public.seva_shifts (role_id, starts_at, ends_at, needed, filled_offline)
       select id, now() + interval '3 days', now() + interval '3 days 3 hours', 4, 1
       from role`,
  );
  sql(`update public.events set seva_open = true where id = '${event}'`);
  // The event's own public page.
  await page.goto(`/mandirs/${slug}/events/${event}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Accessibility check",
  );
  await expectAccessible(page);
  // Its seva rota.
  await page.goto(`/mandirs/${slug}/events/${event}/seva`);
  await expect(page.getByText("1 of 4 taken")).toBeVisible();
  await expectAccessible(page);
});

test("the admin area is accessible", async ({ page }) => {
  test.setTimeout(120_000);
  await logInAsAdmin(page, `a11y-admin-${Date.now()}@example.com`);
  for (const path of [
    "/ops",
    "/ops/today",
    "/ops/mandirs",
    "/ops/mandirs/new",
    "/ops/mandirs/geeta-bhavan-leicester",
    "/ops/posters",
    "/ops/duplicates",
    "/ops/websites",
    "/ops/festivals",
    "/ops/digest",
    "/ops/translations",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
  }
});

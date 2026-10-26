import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee's own numbers: its page's and events' totals from Toran's
// counter, and nobody else's. Test browsers aren't counted (they look
// like bots), so the totals are added straight to the database. Uses a
// mandir no other test looks at.
const SLUG = "exeter-hindu-cultural-centre";

test("a committee sees its own numbers, and only its own", async ({ page }) => {
  const email = `numbers-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing`,
  );
  const title = `Annakut ${Date.now()}`;
  const event = sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, '${title}', now() + interval '10 days', 'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
  const base = `/mandirs/${SLUG}`;
  sql(
    `insert into public.daily_counts as c (metric, path, count) values
       ('view', '${base}', 30),
       ('view', '${base}/events/${event}', 12),
       ('calendar', '${base}/events/${event}', 5),
       ('share', '${base}/events/${event}', 2),
       ('view', '/mandirs/geeta-bhavan-leicester', 1000)
     on conflict (day, metric, path) do update set count = c.count + excluded.count`,
  );

  // From the committee's page.
  await page.goto(`/manage/${SLUG}`);
  await page.getByRole("link", { name: "Numbers", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/manage/${SLUG}/numbers$`));
  const tile = (label: string) =>
    page.locator("dt", { hasText: label }).locator("+ dd");
  await expect(tile("Views of your page and events")).not.toHaveText("0");
  const views = Number(
    (await tile("Views of your page and events").innerText()).replace(/,/g, ""),
  );
  // Its own pages only: not the 1,000 views of another mandir.
  expect(views).toBeGreaterThanOrEqual(42);
  expect(views).toBeLessThan(1000);
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toContainText(/12\s*5\s*2/);
  await expect(row.getByRole("link", { name: title })).toHaveAttribute(
    "href",
    `${base}/events/${event}`,
  );

  // Another mandir's numbers aren't theirs to see.
  await page.goto("/manage/geeta-bhavan-leicester/numbers");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByText("Views of your page and events")).toHaveCount(0);
});

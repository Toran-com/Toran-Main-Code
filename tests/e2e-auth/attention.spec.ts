import { expect, test } from "@playwright/test";
import { logInAsAdmin, sql } from "./helpers";

// Toran admins see what needs following up on /ops/attention. Uses a mandir
// no other test looks at.
const SLUG = "aberdeen-hindu-temple-trust";

test("admins see what needs attention", async ({ page }) => {
  test.setTimeout(90_000);
  const title = `Unconfirmed havan ${Date.now()}`;
  sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, '${title}', now() + interval '6 days', 'published'
       from public.mandirs where slug = '${SLUG}'`,
  );
  // The website checker couldn't reach its site last time.
  sql(
    `update public.sources set last_checked_at = now(), last_outcome = 'unreachable'
       where kind = 'crawler' and mandir_id = (select id from public.mandirs where slug = '${SLUG}');
     insert into public.sources (mandir_id, kind, url, last_checked_at, last_outcome)
       select id, 'crawler', website, now(), 'unreachable'
       from public.mandirs m where slug = '${SLUG}'
       and not exists (select 1 from public.sources s
         where s.mandir_id = m.id and s.kind = 'crawler')`,
  );

  await logInAsAdmin(page, `attention-${Date.now()}@example.com`);
  await page
    .getByRole("navigation", { name: "Admin" })
    .getByRole("link", { name: "Needs attention" })
    .click();
  await expect(page).toHaveURL(/\/ops\/attention$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Needs attention" }),
  ).toBeVisible();

  const unconfirmed = page.getByRole("region", {
    name: /Not confirmed lately/,
  });
  const event = unconfirmed.getByRole("listitem").filter({ hasText: title });
  await expect(event).toContainText("Aberdeen Hindu Temple Trust");
  await expect(event).toContainText("Never confirmed");
  await expect(event).toContainText("No committee on Toran yet");
  await event
    .getByRole("link", { name: /Aberdeen Hindu Temple Trust/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/ops/mandirs/${SLUG}$`));

  await page.goBack();
  const websites = page.getByRole("region", { name: /Websites not read/ });
  await expect(
    websites
      .getByRole("listitem")
      .filter({ hasText: "Aberdeen Hindu Temple Trust" }),
  ).toContainText("Couldn't reach the site");
  // The contents link to each list.
  await page
    .getByRole("link", { name: /^Posters waiting long \(\d+\)$/ })
    .click();
  await expect(page).toHaveURL(/#posters$/);
});

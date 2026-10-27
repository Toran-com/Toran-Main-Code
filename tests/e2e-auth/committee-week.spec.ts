import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// The committee page's "Send this week's events" message and "What's
// changed" list. Uses a mandir no other test looks at.
const SLUG = "bharat-hindu-samaj-peterborough";
const TITLE = "E2E week aarti";

test("a committee sees this week's message and what's changed", async ({
  page,
}) => {
  const email = `week-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
  sql(`update public.mandirs set status = 'claimed' where slug = '${SLUG}'`);
  // Tomorrow evening, read from the mandir's website.
  sql(`delete from public.events where title = '${TITLE}';
    insert into public.events (mandir_id, title, starts_at, status, origin)
      select id, '${TITLE}',
        ((current_date + 1) + time '18:00') at time zone 'Europe/London',
        'published', 'website'
      from public.mandirs where slug = '${SLUG}'`);

  await page.goto(`/manage/${SLUG}`);
  await expect(
    page.getByRole("heading", { name: "Send this week's events" }),
  ).toBeVisible();
  await expect(page.getByText(`: ${TITLE}`).first()).toBeVisible();
  const whatsApp = await page
    .getByRole("link", { name: "Send on WhatsApp" })
    .first()
    .getAttribute("href");
  const message = decodeURIComponent(whatsApp!);
  expect(message).toContain("This week at Bharat Hindu Samaj:");
  expect(message).toContain(`6pm: ${TITLE}`);
  expect(message).toContain(`/mandirs/${SLUG}`);

  const change = page
    .getByRole("listitem")
    .filter({ hasText: TITLE })
    .filter({ hasText: "from your website" });
  await expect(change.getByText("Added", { exact: true })).toBeVisible();

  // Reading posters needs Toran's Anthropic key, which tests don't have.
  await expect(
    page.getByRole("heading", { name: "Have a poster? Send a photo" }),
  ).toHaveCount(0);

  sql(`delete from public.events where title = '${TITLE}'`);
});

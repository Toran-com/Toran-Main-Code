import { expect, test } from "@playwright/test";
import { logIn, sql, mandirSetting } from "./helpers";

// The committee page's "This week's events" message and "Recent
// changes" sheet. Uses a mandir no other test looks at.
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
  await expect(page.getByRole("heading", { name: "Share" })).toBeVisible();
  await expect(page.getByText("This week's events")).toBeVisible();
  // The message itself is a tap away.
  await page.getByText("See the message").click();
  await expect(page.getByText(`: ${TITLE}`).first()).toBeVisible();
  const whatsApp = await page
    .getByRole("link", { name: "Send on WhatsApp" })
    .first()
    .getAttribute("href");
  const message = decodeURIComponent(whatsApp!);
  expect(message).toContain("This week at Bharat Hindu Samaj:");
  expect(message).toContain(`6pm: ${TITLE}`);
  expect(message).toContain(`/mandirs/${SLUG}`);

  const changes = await mandirSetting(page, "Recent changes");
  const change = changes
    .getByRole("listitem")
    .filter({ hasText: TITLE })
    .filter({ hasText: "from your website" });
  await expect(change.getByText("Added", { exact: true })).toBeVisible();

  // Reading posters needs Toran's Anthropic key, which tests don't have.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add events", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Type it in/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Photo of a poster/ }),
  ).toHaveCount(0);
  // Nor does forwarding by email (decision 0031), which also needs it.
  await expect(
    page.getByRole("button", { name: /^Forward it by email/ }),
  ).toHaveCount(0);

  sql(`delete from public.events where title = '${TITLE}'`);
});

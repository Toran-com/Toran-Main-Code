import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// Followers and asks (decision 0022). A family can ask a mandir with
// nothing on Toran to post, and is given a WhatsApp message to send; the
// committee sees how many follow it and asked, never who. The press is
// counted; more totals are added straight to the database. Uses a mandir
// no other test looks at.
const SLUG = "gloucester-pillaiyar-hindu-temple";

test("a family asks a mandir to post; its committee sees followers and asks", async ({
  page,
}) => {
  await page.goto(`/mandirs/${SLUG}`);
  await expect(page.getByText("No events listed yet.")).toBeVisible();
  const ask = page.getByRole("button", { name: "Ask them to post on Toran" });
  await ask.click();
  await expect(
    page.getByText("Thank you: we've added your ask."),
  ).toBeVisible();
  const whatsapp = page.getByRole("link", { name: "Send on WhatsApp" });
  const href = decodeURIComponent((await whatsapp.getAttribute("href")) ?? "");
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(href).toContain("Could Gloucester Pillaiyar (Hindu) Temple");
  expect(href).toMatch(/\/for-mandirs$/);
  // The phone remembers it asked, so it isn't asked twice.
  await page.reload();
  await expect(
    page.getByText("Thank you: we've added your ask."),
  ).toBeVisible();
  await expect(ask).toHaveCount(0);
  // The press added one to the mandir's asks, and nothing else.
  const asks = () =>
    Number(
      sql(
        `select coalesce(sum(count), 0) from public.daily_counts
           where metric = 'ask' and path = '/mandirs/${SLUG}'`,
      ),
    );
  await expect.poll(asks).toBe(1);

  // Its committee.
  const email = `supporters-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing`,
  );
  const base = `/mandirs/${SLUG}`;
  sql(
    `insert into public.daily_counts as c (day, metric, path, count) values
       (current_date, 'follow', '${base}', 9),
       (current_date, 'unfollow', '${base}', 2),
       (current_date - 200, 'follow', '${base}', 40),
       (current_date, 'ask', '${base}', 6),
       (current_date, 'follow', '/mandirs/geeta-bhavan-leicester', 500)
     on conflict (day, metric, path) do update set count = c.count + excluded.count`,
  );
  await page.goto(`/manage/${SLUG}/numbers`);
  const following = page.getByRole("region", {
    name: "People who follow your mandir",
  });
  const tile = (label: string) =>
    following.locator("dt", { hasText: label }).locator("~ dd");
  // Every Follow less every Unfollow, ever: 9 - 2 + 40.
  await expect(tile("Following your mandir").first()).toHaveText("47");
  await expect(tile("Following your mandir").nth(1)).toHaveText(
    "7 new in the last 4 weeks",
  );
  // The press, and the 6 added.
  await expect(tile("Asked you to post on Toran").first()).toHaveText("7");
  await expect(tile("Seva places taken on Toran").first()).toHaveText("0");
});

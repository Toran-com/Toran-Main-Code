import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// A family's plan: picked on one phone, sent on WhatsApp, opened on
// another. Events are added straight to the database; uses a mandir no
// other test looks at.
const SLUG = "hindu-samaj-northstowe-cambridge";

function addEvent(title: string, days: number): string {
  return sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, '${title}',
         date_trunc('day', now() + interval '${days} days') + interval '19 hours',
         'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
}

test("a plan is made on one phone and opened on another", async ({
  page,
  browser,
}) => {
  const garba = `Navratri garba ${Date.now()}`;
  const aarti = `Annakut darshan ${Date.now()}`;
  const garbaId = addEvent(garba, 5);
  // Over eight weeks ahead: still in the plan.
  const aartiId = addEvent(aarti, 70);

  await page.goto(`/mandirs/${SLUG}/events/${aartiId}`);
  await page.getByRole("button", { name: "Add to our plan" }).click();
  await expect(
    page.getByRole("button", { name: "In our plan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`/mandirs/${SLUG}/events/${garbaId}`);
  await page.getByRole("button", { name: "Add to our plan" }).click();
  await page.getByRole("link", { name: "See our plan (2) →" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/plan\\?events=(${garbaId},${aartiId}|${aartiId},${garbaId})$`),
  );
  const items = page.getByRole("listitem");
  await expect(items.filter({ hasText: garba })).toBeVisible();
  await expect(items.filter({ hasText: aarti })).toBeVisible();
  await expect(page.getByText("All in your plan")).toBeVisible();

  // One WhatsApp message with both, and a link to the whole plan.
  const send = page.getByRole("link", {
    name: "Send to the family on WhatsApp",
  });
  const message = decodeURIComponent(
    (await send.getAttribute("href"))!.replace("https://wa.me/?text=", ""),
  );
  expect(message).toMatch(/^Our plan:/);
  expect(message.indexOf(garba)).toBeLessThan(message.indexOf(aarti));
  const shared = message.match(
    /All of it on Toran: \S+(\/plan\?events=\S+)/,
  )![1];

  // Someone in the family opens it and keeps it too.
  const family = await browser.newPage();
  await family.goto(shared);
  await expect(family.getByText(garba)).toBeVisible();
  await family.getByRole("button", { name: "Add these to my plan" }).click();
  await expect(family.getByText("All in your plan")).toBeVisible();
  await family.goto("/plan");
  await expect(family).toHaveURL(/\/plan\?events=/);
  await expect(family.getByText(aarti)).toBeVisible();
  await family.close();

  // Back on the first phone: take one out, then clear the rest.
  await items
    .filter({ hasText: garba })
    .getByRole("button", { name: "Take out of the plan" })
    .click();
  // Gone at once; the page before stays hidden for going back, so count
  // only what is on screen.
  await expect(items.filter({ hasText: garba })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/plan\\?events=${aartiId}$`));
  await expect(items.filter({ hasText: aarti })).toBeVisible();
  await page.getByRole("button", { name: "Clear the plan" }).click();
  await expect(page.getByText(/Nothing in your plan yet/)).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// My Toran with real data: a mandir followed, an event planned, and one
// marked "I went" on its page, all brought together with their names.
// Uses a mandir no other test looks at.
const SLUG = "reading-hindu-temple";
const NAME = "Reading Hindu Temple";

function addEvent(title: string, startsIn: string): string {
  return sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, '${title}', now() + interval '${startsIn}', 'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
}

test("My Toran brings together what this phone keeps", async ({ page }) => {
  const kirtan = `Bhajan sandhya ${Date.now()}`;
  const aarti = `Evening aarti ${Date.now()}`;
  const kirtanId = addEvent(kirtan, "3 days");
  // Started a few minutes ago, so "I went" shows.
  const aartiId = addEvent(aarti, "-5 minutes");

  await page.goto(`/mandirs/${SLUG}`);
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await page.goto(`/mandirs/${SLUG}/events/${kirtanId}`);
  await page.getByRole("button", { name: "Add to our plan" }).click();
  // Not started yet: nothing to say about going.
  await expect(page.getByRole("button", { name: "I went" })).toHaveCount(0);

  await page.goto(`/mandirs/${SLUG}/events/${aartiId}`);
  await page.getByRole("button", { name: "I went" }).click();
  await expect(page.getByRole("link", { name: /You went/ })).toHaveAttribute(
    "href",
    "/my",
  );

  // In the header on every page.
  await page.getByRole("link", { name: "My Toran" }).first().click();
  await expect(page).toHaveURL(/\/my$/);

  const coming = page.getByRole("region", { name: "Coming up" });
  await expect(coming.getByRole("link", { name: kirtan })).toHaveAttribute(
    "href",
    `/mandirs/${SLUG}/events/${kirtanId}`,
  );
  await expect(coming).toContainText(`${NAME}, Reading · In your plan`);

  const mandirs = page.getByRole("region", { name: "My mandirs" });
  await expect(mandirs.getByRole("link", { name: NAME })).toHaveAttribute(
    "href",
    `/mandirs/${SLUG}`,
  );

  const past = page.getByRole("region", { name: "Past events" });
  await expect(past.getByRole("link", { name: aarti })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "This year" }).getByText("events"),
  ).toBeVisible();

  // Unfollowing from here.
  await mandirs.getByRole("button", { name: `Stop following ${NAME}` }).click();
  await expect(
    mandirs.getByText(/You don't follow any mandirs yet/),
  ).toBeVisible();

  // The same in Gujarati.
  await page.goto("/gu/my");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "મારું Toran",
  );
  await expect(page.getByRole("link", { name: aarti })).toBeVisible();
});

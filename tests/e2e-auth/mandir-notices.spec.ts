import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee posts a notice to visitors ("Closed today"); it shows at the
// top of the mandir's page and its events' pages until its last day, and
// goes when removed. Uses a mandir no other test looks at.
const SLUG = "baps-shri-swaminarayan-mandir-luton";

test("a committee posts a notice that families see, then removes it", async ({
  page,
}) => {
  const email = `notices-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id, consented_at)
       select m.id, u.id, now() from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing`,
  );
  const event = sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, 'Notice test satsang', now() + interval '3 days', 'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );

  await page.goto(`/manage/${SLUG}`);
  const card = page.getByRole("region", { name: "Notice for visitors" });
  await card.getByRole("button", { name: "Post a notice" }).click();
  const sheet = page.getByRole("dialog", { name: "Post a notice" });
  // A quick pick fills the box, ready to finish.
  await sheet
    .getByRole("button", { name: "The car park is closed today" })
    .click();
  const box = sheet.getByLabel("The notice");
  await expect(box).toHaveValue(
    "The car park is closed today. Please park on the street.",
  );
  await box.fill("Closed today because of the snow. Aarti online at 7pm.");
  await sheet.getByLabel("The next 7 days").check();
  await sheet.getByRole("button", { name: "Post the notice" }).click();
  await expect(page.getByText("Posted. It's at the top")).toBeVisible();
  await expect(card).toContainText("Showing until");
  await expect(card).toContainText("Closed today because of the snow");

  // Families see it on the mandir's page and its events' pages.
  for (const path of [`/mandirs/${SLUG}`, `/mandirs/${SLUG}/events/${event}`]) {
    await page.goto(path);
    const notice = page.getByRole("region", { name: "Notice from the mandir" });
    await expect(notice).toContainText(
      "Closed today because of the snow. Aarti online at 7pm.",
    );
    await expect(notice).toContainText(/Until \w{3} \d+ \w{3}/);
  }

  // Removed: gone from the page.
  await page.goto(`/manage/${SLUG}`);
  await card.getByRole("button", { name: "Remove this notice" }).click();
  await expect(page.getByText("Notice removed from your page.")).toBeVisible();
  await page.goto(`/mandirs/${SLUG}`);
  await expect(
    page.getByRole("region", { name: "Notice from the mandir" }),
  ).toHaveCount(0);
});

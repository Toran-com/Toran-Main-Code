import { expect, test } from "@playwright/test";
import { logInAsAdmin, sql } from "./helpers";

// Patrikas and posters a website check found are listed on /ops/websites,
// each with a way to type it up in the review queue. The check itself is
// covered by tests/unit/website-check.test.ts (it reads other people's
// websites), so its result is saved straight to the database here. Uses a
// mandir no other test looks at.
const SLUG = "hindu-mandir-glasgow";
const PDF = "https://www.hindumandirglasgow.org/files/diwali-patrika.pdf";

test("a patrika found on a mandir's website can be typed up", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await logInAsAdmin(page, `websites-${Date.now()}@example.com`);
  const documents = JSON.stringify([
    { url: PDF, kind: "pdf", label: "Diwali patrika" },
  ]);
  sql(
    `with m as (select id from public.mandirs where slug = '${SLUG}'),
     saved as (
       update public.sources
         set last_checked_at = now(), last_outcome = 'none', last_found = 0,
             last_notes = 'Read 2 pages.', last_documents = '${documents}'
         where mandir_id = (select id from m) and kind = 'crawler'
         returning id)
     insert into public.sources (mandir_id, kind, label, last_checked_at, last_outcome, last_found, last_notes, last_documents)
       select id, 'crawler', 'Website', now(), 'none', 0, 'Read 2 pages.', '${documents}'
       from m where not exists (select 1 from saved)`,
  );

  await page.goto("/ops/websites");
  const found = page.getByRole("list", {
    name: "Patrikas and posters on Hindu Mandir Glasgow's website",
  });
  await expect(
    found.getByRole("link", { name: "PDF: Diwali patrika" }),
  ).toHaveAttribute("href", PDF);
  await found.getByRole("link", { name: /^Type it up/ }).click();

  // The form starts with the mandir, the patrika as the link, and where
  // it came from.
  await expect(page).toHaveURL(/\/ops\/posters\?/);
  const form = page.locator("#type-up").locator("..").locator("form");
  await expect(
    form.getByRole("combobox", { name: "Mandir", exact: true }),
  ).toHaveValue(SLUG);
  await expect(form.getByLabel("Link for more details (optional)")).toHaveValue(
    PDF,
  );
  await expect(
    form.getByRole("combobox", { name: "Where it came from" }),
  ).toHaveValue("website");
});

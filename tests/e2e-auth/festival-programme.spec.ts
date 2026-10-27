import { expect, type Page, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A festival's nights in a row (Navratri garba, say), entered once: it
// shows once on the mandir's page with its next date, and every night is
// listed on the event's own page. Uses a mandir no other test looks at.
const SLUG = "hindu-temple-geeta-bhawan-derby";

// A London date some days from today, as the date input wants it.
function inDays(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + days * 86_400_000));
}

// Fills "Add an event" for a run of nights. The form can come back with
// its details kept and the repeat part already open.
async function addRun(page: Page, title: string, lastDay: number) {
  await page.getByLabel("What's happening?").fill(title);
  await page.getByLabel("Date").fill(inDays(10));
  await page.getByLabel("Starts").fill("20:00");
  const repeats = page.getByRole("combobox", { name: /^Repeats/ });
  if (!(await repeats.isVisible())) {
    await page.getByText("Happens every day, week or month?").click();
  }
  await repeats.selectOption("daily");
  await page.getByLabel("Repeats until").fill(inDays(lastDay));
  await page.getByRole("button", { name: "Add event" }).click();
}

test("a run of nights is one event with every date listed", async ({
  page,
}) => {
  const email = `programme-${Date.now()}@example.com`;
  const title = `Navratri garba ${Date.now()}`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
  await page.goto(`/manage/${SLUG}`);

  // Longer than a month is refused.
  await addRun(page, title, 60);
  await expect(page.getByText(/within a month of the first/)).toBeVisible();

  await addRun(page, title, 14);
  await expect(page.getByText("Added.")).toBeVisible();

  // Once on the mandir's page.
  await page.goto(`/mandirs/${SLUG}`);
  const listing = page.getByRole("article").filter({ hasText: title });
  await expect(listing).toHaveCount(1);
  await expect(listing).toContainText(/Every day until/);

  // Every night on its own page.
  await listing.getByRole("link", { name: title }).click();
  const dates = page.getByRole("region", { name: "Every date" });
  await expect(dates.getByRole("listitem")).toHaveCount(5);
});

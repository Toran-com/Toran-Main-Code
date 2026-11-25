import { expect, test } from "@playwright/test";
import { addEventsBy, logIn, sql } from "./helpers";

// A committee says what language an event is in; families find it with
// What's on's language filter, and its page says so. Uses a mandir no
// other test looks at.
const SLUG = "hindu-devi-mandir-milton-keynes-milton-keynes";

function nextWeek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 7 * 86_400_000));
}

test("an event in Gujarati can be found by its language", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const email = `languages-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id, consented_at)
       select m.id, u.id, now() from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'
       on conflict do nothing`,
  );

  await page.goto(`/manage/${SLUG}`);
  await addEventsBy(page, "Type it in");
  await page.getByLabel("What's happening?").fill("Ramayan katha in Gujarati");
  await page.getByLabel("Date").fill(nextWeek());
  await page.getByLabel("Starts").fill("19:00");
  await page.getByText("Say what language it's in (optional)").click();
  await page.getByLabel("ગુજરાતી (Gujarati)").check();
  await page.getByLabel("English", { exact: true }).check();
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByText("Added.")).toBeVisible();
  expect(
    sql(`select array_to_string(languages, ',') from public.events
           where title = 'Ramayan katha in Gujarati'`),
  ).toBe("en,gu");

  // Families: the filter offers Gujarati, and finds it.
  const family = await browser.newPage();
  await family.goto("/whats-on");
  await family.getByText("Filter").click();
  const language = family.getByRole("navigation", { name: "Language" });
  await language.getByRole("link", { name: "ગુજરાતી (Gujarati)" }).click();
  await expect(family).toHaveURL(/[?&]lang=gu/);
  const row = family
    .getByRole("article")
    .filter({ hasText: "Ramayan katha in Gujarati" });
  await expect(row).toBeVisible();
  // Not in Tamil.
  await family.goto("/whats-on?lang=ta");
  await expect(
    family.getByRole("article").filter({ hasText: "Ramayan katha" }),
  ).toHaveCount(0);

  // Its page says which languages.
  await family.goto("/whats-on?lang=gu");
  await family.getByRole("link", { name: /Ramayan katha in Gujarati/ }).click();
  await expect(family.getByText("English, ગુજરાતી (Gujarati)")).toBeVisible();
  await family.close();
});

import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee plans the seva rota for an event and gets it ready to send
// to its volunteers' WhatsApp group. Uses a mandir no other test looks at.
const SLUG = "swindon-hindu-temple-and-cultural-centre";

function nextWeek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 7 * 86_400_000));
}

test("a committee plans a seva rota", async ({ page }) => {
  test.setTimeout(90_000);
  const email = `seva-${Date.now()}@example.com`;
  await logIn(page, email);
  // Give this person the mandir directly (the claim flow is tested elsewhere).
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );

  await page.goto(`/manage/${SLUG}`);
  await page.getByLabel("What's happening?").fill("Diwali celebrations");
  await page.getByLabel("Date").fill(nextWeek());
  await page.getByLabel("Starts").fill("18:30");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Added.")).toBeVisible();

  await page
    .getByRole("listitem")
    .filter({ hasText: "Diwali celebrations" })
    .getByRole("link", { name: "Seva rota" })
    .click();
  await expect(page.getByText("Diwali celebrations")).toBeVisible();

  await page.getByLabel("Role", { exact: true }).fill("Kitchen");
  await page.getByLabel(/What it involves/).fill("Serving prasad");
  await page.getByRole("button", { name: "Add role" }).click();
  await expect(page.getByText("Role added.")).toBeVisible();

  const shift = page.getByRole("form", { name: "Add a shift to Kitchen" });
  await shift.getByLabel("From").fill("17:00");
  await shift.getByLabel("To").fill("20:00");
  await shift.getByLabel("People").fill("4");
  await shift.getByRole("button", { name: "Add shift" }).click();
  await expect(page.getByText("Shift added.")).toBeVisible();
  await expect(page.getByText(/5pm–8pm · 4 people/)).toBeVisible();

  // Ready to send to the volunteers' group.
  const message = page.locator("pre");
  await expect(message).toContainText("Seva for Diwali celebrations");
  await expect(message).toContainText("*Kitchen*");
  await expect(message).toContainText("5pm–8pm: 4 people");
  const whatsApp = await page
    .getByRole("link", { name: "WhatsApp" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsApp!)).toContain(
    "Seva for Diwali celebrations",
  );

  // Removing a role asks first.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Remove Kitchen" }).click();
  await expect(page.getByText("Removed.")).toBeVisible();
  await expect(page.locator("pre")).toHaveCount(0);
});

test("someone else can't see a mandir's rota", async ({ page }) => {
  const event = sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, 'Rota privacy check', now() + interval '7 days', 'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
  await logIn(
    page,
    `outsider-seva-${Date.now()}@example.com`,
    `/manage/${SLUG}/seva/${event}`,
  );
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

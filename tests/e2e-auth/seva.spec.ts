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

test("a committee plans a seva rota and volunteers take slots", async ({
  page,
  browser,
}) => {
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
  await expect(page.getByText(/5pm–8pm · 0 of 4 taken/)).toBeVisible();

  // Someone said yes in WhatsApp: the committee counts them in.
  await page.getByRole("button", { name: /One more counted by you/ }).click();
  await expect(page.getByText("Count updated.")).toBeVisible();
  await expect(page.getByText(/5pm–8pm · 1 of 4 taken/)).toBeVisible();

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

  // The committee lets volunteers take slots on Toran.
  await page
    .getByRole("button", { name: "Let volunteers take slots on Toran" })
    .click();
  await expect(page.getByText("Volunteers can now take slots")).toBeVisible();
  await expect(message).toContainText("5pm–8pm: 1 of 4 taken");
  await expect(message).toContainText("Take a slot at the link below");
  const sevaPage = (await page
    .getByRole("link", { name: "See the volunteers' page" })
    .getAttribute("href"))!;
  expect(sevaPage).toMatch(new RegExp(`^/mandirs/${SLUG}/events/[^/]+/seva$`));

  // A volunteer takes a slot, with no login and no name.
  const visitor = await browser.newPage();
  await visitor.goto(sevaPage);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    "Help with seva",
  );
  await expect(visitor.getByText("1 of 4 taken")).toBeVisible();
  await visitor
    .getByRole("button", { name: /Take this slot: Kitchen/ })
    .click();
  await expect(visitor.getByText(/You're on Kitchen/)).toBeVisible();
  await expect(
    visitor.getByRole("link", { name: "Google Calendar" }),
  ).toHaveAttribute("href", /calendar\.google\.com/);
  // The count is shared; the slot is remembered by the volunteer's phone.
  await visitor.reload();
  await expect(visitor.getByText("2 of 4 taken")).toBeVisible();
  await expect(visitor.getByText(/You're on Kitchen/)).toBeVisible();
  // The event's own page points to the rota.
  await visitor.goto(sevaPage.replace(/\/seva$/, ""));
  await expect(
    visitor.getByRole("link", { name: "Take a seva slot" }),
  ).toBeVisible();

  // The committee sees it, without a name.
  await page.reload();
  await expect(page.getByText("1 counted by you, 1 on Toran")).toBeVisible();

  // The volunteer can't make it after all.
  await visitor.goto(sevaPage);
  await visitor.getByRole("button", { name: "I can't make it" }).click();
  await expect(visitor.getByText(/You're on Kitchen/)).toHaveCount(0);
  await visitor.reload();
  await expect(visitor.getByText("1 of 4 taken")).toBeVisible();

  // The Seva page finds it too: choose Kitchen, open the event's shifts and
  // take one there, to a thank-you.
  await visitor.goto("/seva");
  await visitor.getByRole("button", { name: /^Kitchen/ }).click();
  await expect(
    visitor.getByRole("button", { name: /^Kitchen/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(visitor).toHaveURL(/kind=kitchen/);
  const card = visitor.getByRole("article").filter({
    has: visitor.getByRole("link", { name: "Diwali celebrations" }),
  });
  await expect(card.getByText("3 still needed")).toBeVisible();
  await card.getByRole("button", { name: /Choose/ }).click();
  await card.getByRole("button", { name: /Take this slot: Kitchen/ }).click();
  const thanks = visitor.getByRole("dialog");
  await expect(
    thanks.getByRole("heading", { name: "Thank you!" }),
  ).toBeVisible();
  await expect(thanks.getByText("You're on Kitchen")).toBeVisible();
  await expect(
    thanks.getByRole("link", { name: "Ask friends on WhatsApp" }),
  ).toHaveAttribute("href", /wa\.me.*Diwali%20celebrations/);
  await thanks.getByRole("button", { name: "Back to seva" }).click();
  await expect(thanks).toBeHidden();
  // "Your seva" at the top keeps it, for this phone only.
  await expect(
    visitor
      .getByRole("region", { name: "Your seva" })
      .getByText(/You're on Kitchen/),
  ).toBeVisible();

  // If slots look wrong (say, a joke), the committee can clear them.
  await page.reload();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Clear Toran slots" }).click();
  await expect(page.getByText("were cleared")).toBeVisible();
  await expect(page.getByText(/5pm–8pm · 1 of 4 taken/)).toBeVisible();
  await visitor.close();

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

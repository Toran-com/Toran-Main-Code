import { expect, type Page, test } from "@playwright/test";
import { logIn, sql, addEventsBy, eventMenu } from "./helpers";

// A committee asks for seva, for one of its events or on its own, and
// sends it to its volunteers' WhatsApp group; volunteers take places with
// no name. Uses a mandir no other test looks at.
const SLUG = "swindon-hindu-temple-and-cultural-centre";

function nextWeek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 7 * 86_400_000));
}

async function committee(page: Page, who: string) {
  const email = `${who}-${Date.now()}@example.com`;
  await logIn(page, email);
  // Give this person the mandir directly (the claim flow is tested elsewhere).
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
}

// One seva's card on the committee's seva page.
function sevaCard(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name }) });
}

// The volunteers' page a seva's message links to.
async function volunteersPage(page: Page, name: string): Promise<string> {
  await sevaCard(page, name)
    .getByRole("button", { name: "Send to volunteers" })
    .click();
  const sheet = page.getByRole("dialog", {
    name: `Send ${name} to volunteers`,
  });
  const text = (await sheet.locator("pre").textContent())!;
  await sheet.getByRole("button", { name: "Close" }).click();
  return new URL(/https?:\/\/\S+/.exec(text)![0]).pathname;
}

test("a committee adds seva for an event and volunteers take places", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await committee(page, "seva");

  await page.goto(`/manage/${SLUG}`);
  await addEventsBy(page, "Type it in");
  await page.getByLabel("What's happening?").fill("Diwali celebrations");
  await page.getByLabel("Date").fill(nextWeek());
  await page.getByLabel("Starts").fill("18:30");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByText("Added.")).toBeVisible();

  // From the event's menu: the seva page, adding seva for this event,
  // with its day and start time already in.
  const diwali = await eventMenu(page, "Diwali celebrations");
  await diwali.getByRole("link", { name: "Add seva" }).click();
  await expect(page).toHaveURL(/\/seva\?event=/);
  const add = page.getByRole("dialog", { name: "Add seva" });
  await expect(add).toBeVisible();
  await expect(add.getByLabel("Is it for one of your events?")).toHaveValue(
    /.+/,
  );
  await expect(add.getByLabel("Day", { exact: true })).toHaveValue(nextWeek());
  await expect(add.getByLabel("From", { exact: true })).toHaveValue("18:30");
  await expect(
    add.getByText(/put in when Diwali celebrations starts/),
  ).toBeVisible();

  // The kitchen starts before the event: the times can still be changed.
  await add.getByLabel("What's the seva?").fill("Kitchen");
  await add.getByLabel(/What it involves/).fill("Serving prasad");
  await add.getByLabel("From", { exact: true }).fill("17:00");
  await add.getByLabel("To", { exact: true }).fill("20:00");
  await add.getByLabel("People needed").fill("4");
  await add.getByRole("button", { name: "Add seva" }).click();
  await expect(page.getByText("Seva added.")).toBeVisible();

  const kitchen = sevaCard(page, "Kitchen");
  await expect(kitchen.getByText(/For Diwali celebrations/)).toBeVisible();
  await expect(kitchen.getByText(/5pm–8pm · 0 of 4 taken/)).toBeVisible();
  await expect(kitchen.getByText("Open on Toran")).toBeVisible();

  // Someone said yes in WhatsApp: the committee counts them in.
  await kitchen
    .getByRole("button", { name: /One more counted by you, Kitchen/ })
    .click();
  await expect(page.getByText("Count updated.")).toBeVisible();
  await expect(kitchen.getByText(/5pm–8pm · 1 of 4 taken/)).toBeVisible();

  // Ready to send to the volunteers' group, with the link to take a place.
  await kitchen.getByRole("button", { name: "Send to volunteers" }).click();
  const send = page.getByRole("dialog", {
    name: "Send Kitchen to volunteers",
  });
  const message = send.locator("pre");
  await expect(message).toContainText("Seva for Diwali celebrations");
  await expect(message).toContainText("*Kitchen*");
  await expect(message).toContainText("5pm–8pm: 1 of 4 taken");
  await expect(message).toContainText("Take a slot at the link below");
  const whatsApp = await send
    .getByRole("link", { name: "Send on WhatsApp" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsApp!)).toContain(
    "Seva for Diwali celebrations",
  );
  await send.getByRole("button", { name: "Close" }).click();
  const sevaPage = await volunteersPage(page, "Kitchen");
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
  await expect(kitchen.getByText("1 counted by you, 1 on Toran")).toBeVisible();

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

  // If places look wrong (say, a joke), the committee can clear them.
  await page.reload();
  page.once("dialog", (dialog) => void dialog.accept());
  await kitchen.getByRole("button", { name: "Clear Toran places" }).click();
  await expect(page.getByText("were cleared")).toBeVisible();
  await expect(kitchen.getByText(/5pm–8pm · 1 of 4 taken/)).toBeVisible();
  await visitor.close();

  // Removing a seva asks first.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Remove Kitchen" }).click();
  await expect(page.getByText("Removed.")).toBeVisible();
  await expect(sevaCard(page, "Kitchen")).toHaveCount(0);
});

test("a committee adds seva on its own, then links it to an event", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await committee(page, "seva-own");
  const event = sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, 'Annakut darshan', now() + interval '9 days', 'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );

  await page.goto(`/manage/${SLUG}/seva`);
  await page.getByRole("button", { name: "Add seva" }).click();
  const add = page.getByRole("dialog", { name: "Add seva" });
  await add.getByLabel("What's the seva?").fill("Sunday cleaning");
  await expect(add.getByLabel("Is it for one of your events?")).toHaveValue("");
  await add.getByLabel("Day", { exact: true }).fill(nextWeek());
  await add.getByLabel("From", { exact: true }).fill("10:00");
  await add.getByLabel("To", { exact: true }).fill("12:00");
  await add.getByLabel("People needed").fill("3");
  await add.getByRole("button", { name: "Add seva" }).click();
  await expect(page.getByText("Seva added.")).toBeVisible();

  const cleaning = sevaCard(page, "Sunday cleaning");
  await expect(
    cleaning.getByText("On its own, not for an event"),
  ).toBeVisible();
  await expect(cleaning.getByText(/10am–12pm · 0 of 3 taken/)).toBeVisible();

  // It has its own page for volunteers.
  const own = await volunteersPage(page, "Sunday cleaning");
  expect(own).toMatch(new RegExp(`^/mandirs/${SLUG}/seva/[^/]+$`));
  const visitor = await browser.newPage();
  await visitor.goto(own);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    "Help with seva",
  );
  await expect(
    visitor.getByRole("heading", { level: 2, name: "Sunday cleaning" }),
  ).toBeVisible();
  await visitor
    .getByRole("button", { name: /Take this slot: Sunday cleaning/ })
    .click();
  await expect(visitor.getByText(/You're on Sunday cleaning/)).toBeVisible();
  await page.reload();
  await expect(cleaning.getByText(/10am–12pm · 1 of 3 taken/)).toBeVisible();

  // Later it's linked to an event: its page moves to the event's seva.
  await page.getByRole("button", { name: "Change Sunday cleaning" }).click();
  const change = page.getByRole("dialog", { name: "Change Sunday cleaning" });
  await change
    .getByLabel("Is it for one of your events?")
    .selectOption({ value: event });
  await change.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Seva changed.")).toBeVisible();
  await expect(cleaning.getByText(/For Annakut darshan/)).toBeVisible();
  // Its times stay as they were.
  await expect(cleaning.getByText(/10am–12pm · 1 of 3 taken/)).toBeVisible();
  await visitor.goto(own);
  await expect(visitor).toHaveURL(
    new RegExp(`/mandirs/${SLUG}/events/${event}/seva$`),
  );

  // Not taking places on Toran any more.
  await cleaning
    .getByRole("button", { name: "Stop taking places on Toran" })
    .click();
  await expect(
    page.getByText("Volunteers can no longer take places on Toran."),
  ).toBeVisible();
  await expect(cleaning.getByText("Not open on Toran")).toBeVisible();
  await visitor.reload();
  await expect(
    visitor.getByRole("button", { name: /Take this slot/ }),
  ).toHaveCount(0);
  await visitor.close();
});

test("someone else can't see a mandir's seva", async ({ page }) => {
  await logIn(
    page,
    `outsider-seva-${Date.now()}@example.com`,
    `/manage/${SLUG}/seva`,
  );
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { logInAsAdmin, sql } from "./helpers";

// Toran types up a forwarded poster for a mandir nobody looks after yet,
// and publishes it. (A committee publishing its own is in
// mandir-admin.spec.ts.) Uses a mandir no other test looks at.
const SLUG = "slough-hindu-mandir";

function nextWeek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 7 * 86_400_000));
}

test("Toran publishes a poster for a mandir with no committee", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await logInAsAdmin(page, `posters-${Date.now()}@example.com`);
  await page.goto("/ops/posters");
  await page.getByRole("combobox", { name: /^Mandir/ }).selectOption(SLUG);
  await page.getByLabel("What's happening?").fill("Navratri garba");
  await page.getByLabel("Date").fill(nextWeek());
  await page.getByLabel("Starts").fill("20:00");
  await page
    .getByText("Add the name and description in Gujarati (optional)")
    .click();
  await page.getByLabel("Name in Gujarati").fill("નવરાત્રી ગરબા");
  await page.getByRole("button", { name: "Add to the queue" }).click();
  await expect(page.getByText("Added to the queue.")).toBeVisible();

  const poster = page
    .getByRole("listitem")
    .filter({ hasText: "Navratri garba" });
  await expect(poster).toContainText("Slough Hindu Mandir");
  await expect(poster).toContainText("No committee yet");
  await expect(poster).toContainText("From: WhatsApp forward");
  await expect(poster.locator('[lang="gu"]')).toHaveText("નવરાત્રી ગરબા");
  await poster.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Navratri garba" }),
  ).toHaveCount(0);

  // It's on the public page, but not marked as confirmed by the mandir.
  await page.goto(`/mandirs/${SLUG}`);
  const event = page.getByRole("article").filter({ hasText: "Navratri garba" });
  await expect(event).toContainText("8pm");
  await expect(event.locator('[lang="gu"]').first()).toHaveText(
    "નવરાત્રી ગરબા",
  );
  await expect(event).not.toContainText("Confirmed by the mandir");
  await expect(event).toContainText("From a poster or message");
});

test("the review queue keeps one copy of each event, and a poster can be fixed first", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Another mandir no other test looks at.
  const slug = "hindu-cultural-religious-centre-leicester";
  const title = `Diwali deepotsav ${Date.now()}`;
  const addPoster = async (name: string, time: string) => {
    await page.goto("/ops/posters");
    await page.getByRole("combobox", { name: /^Mandir/ }).selectOption(slug);
    await page.getByLabel("What's happening?").fill(name);
    await page.getByLabel("Date").fill(nextWeek());
    await page.getByLabel("Starts").fill(time);
    await page.getByRole("button", { name: "Add to the queue" }).click();
  };
  await logInAsAdmin(page, `review-${Date.now()}@example.com`);
  for (const time of ["18:00", "19:00"]) {
    await addPoster(title, time);
    await expect(page.getByText("Added to the queue.")).toBeVisible();
  }

  // The same name an hour apart: each says the other is waiting.
  const items = page
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ hasText: "Also waiting:" });
  await expect(items).toHaveCount(2);

  // Fix the first one's name and publish it.
  await items
    .first()
    .getByRole("link", { name: "Fix something first" })
    .click();
  await expect(page).toHaveURL(/fix=/);
  await page.getByLabel("What's happening?").first().fill(`${title} (fixed)`);
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  // The other may be the published event: Toran says it's the same, and
  // nothing is listed twice.
  const other = page
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
  await expect(other).toContainText("This may already be on the page");
  await expect(
    other.getByRole("button", { name: "Publish", exact: true }),
  ).toHaveCount(0);
  await other
    .getByRole("button", { name: "Same event: add what's new to it" })
    .click();
  await expect(page.getByText("It was already on the page")).toBeVisible();

  // Typing it up again is refused outright.
  await addPoster(`${title} (fixed)`, "18:00");
  await expect(
    page.getByText("That event is already on Toran, or already waiting"),
  ).toBeVisible();

  await page.goto(`/mandirs/${slug}`);
  await expect(
    page.getByRole("article").filter({ hasText: title }),
  ).toHaveCount(1);

  // The database refuses an exact copy, however it's added.
  expect(() =>
    sql(
      `insert into public.events (mandir_id, title, starts_at, status)
         select mandir_id, title, starts_at, 'published' from public.events
         where title = '${title} (fixed)'`,
    ),
  ).toThrow();
});

test("Toran previews the weekly digest", async ({ page }) => {
  test.setTimeout(60_000);
  await logInAsAdmin(page, `digest-${Date.now()}@example.com`);
  await page.goto("/ops/digest");
  await expect(
    page.getByRole("heading", { name: "What's on at mandirs" }),
  ).toBeVisible();
  await expect(page.getByText("Nobody receives it yet")).toBeVisible();
  // The WhatsApp version, then the plain text.
  const whatsApp = page.locator("pre").first();
  const plain = page.locator("pre").last();
  await expect(whatsApp).toContainText("*What's on at mandirs*");
  await expect(plain).toContainText("What's on at mandirs:");
  await expect(plain).toContainText("/whats-on");
  await expect(
    page.getByRole("button", { name: "Copy the email" }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: /^Region/ }).selectOption("Wales");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/region=Wales/);
  await expect(plain).toContainText("(Wales)");
});

test("Toran can review the Gujarati draft", async ({ page }) => {
  test.setTimeout(60_000);
  await logInAsAdmin(page, `translations-${Date.now()}@example.com`);
  await page.goto("/ops/translations");
  await expect(page.getByText("isn't shown on the site")).toBeVisible();
  const line = page.getByRole("listitem").filter({ hasText: "Toran home" });
  await expect(line.locator('[lang="gu"]')).toContainText("મુખ્ય પાનું");
  await expect(
    page.getByRole("button", { name: "Copy the list" }),
  ).toBeVisible();
});

test("a visitor tells us about an event, and Toran sees it in the queue", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const slug = "iskcon-leicester";
  const visitor = await browser.newPage();
  await visitor.goto(`/mandirs/${slug}`);
  await visitor
    .getByRole("link", { name: "Know about an event here? Tell us →" })
    .click();
  await expect(visitor).toHaveURL(new RegExp(`/mandirs/${slug}/tell-us$`));
  await visitor.getByLabel("What's happening?").fill("Kartik deepotsav");
  await visitor.getByLabel("Date").fill(nextWeek());
  await visitor.getByLabel(/^Starts/).fill("18:00");
  await visitor
    .getByLabel(/Where did you see it/)
    .fill("https://example.org/poster");
  await visitor.getByRole("button", { name: "Send" }).click();
  await expect(visitor.getByText("Thank you.")).toBeVisible();

  // Something only spam fills in is quietly thrown away.
  await visitor.goto(`/mandirs/${slug}/tell-us`);
  await visitor.getByLabel("What's happening?").fill("Spam event");
  await visitor.getByLabel("Date").fill(nextWeek());
  await visitor.locator('input[name="company"]').fill("Spam Ltd", {
    force: true,
  });
  await visitor.getByRole("button", { name: "Send" }).click();
  await expect(visitor.getByText("Thank you.")).toBeVisible();

  // Not on the public page until someone checks it.
  await visitor.goto(`/mandirs/${slug}`);
  await expect(visitor.getByText("Kartik deepotsav")).toHaveCount(0);

  await logInAsAdmin(page, `reports-${Date.now()}@example.com`);
  await page.goto("/ops/posters");
  const report = page
    .getByRole("listitem")
    .filter({ hasText: "Kartik deepotsav" });
  await expect(report).toContainText("ISKCON Leicester");
  await expect(report).toContainText("From: Sent in by a visitor");
  await expect(report).toContainText("https://example.org/poster");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Spam event" }),
  ).toHaveCount(0);
  // Toran can't pretend to be a visitor when typing up a poster.
  await expect(
    page.getByRole("option", { name: "Sent in by a visitor" }),
  ).toHaveCount(0);
  // Tidy up, so the queue is as it was.
  await report.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText("Discarded.")).toBeVisible();
});

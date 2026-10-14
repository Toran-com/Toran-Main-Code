import { expect, test } from "@playwright/test";
import { logInAsAdmin } from "./helpers";

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
});

test("Toran previews the weekly digest", async ({ page }) => {
  test.setTimeout(60_000);
  await logInAsAdmin(page, `digest-${Date.now()}@example.com`);
  await page.goto("/ops/digest");
  await expect(
    page.getByRole("heading", { name: "What's on at mandirs" }),
  ).toBeVisible();
  await expect(page.getByText("Nobody receives it yet")).toBeVisible();
  await expect(page.locator("pre")).toContainText("What's on at mandirs:");
  await expect(page.locator("pre")).toContainText("/whats-on");

  await page.getByRole("combobox", { name: /^Region/ }).selectOption("Wales");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/region=Wales/);
  await expect(page.locator("pre")).toContainText("(Wales)");
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

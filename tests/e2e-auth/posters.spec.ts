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
  await page.getByRole("button", { name: "Add to the queue" }).click();
  await expect(page.getByText("Added to the queue.")).toBeVisible();

  const poster = page
    .getByRole("listitem")
    .filter({ hasText: "Navratri garba" });
  await expect(poster).toContainText("Slough Hindu Mandir");
  await expect(poster).toContainText("No committee yet");
  await expect(poster).toContainText("From: WhatsApp forward");
  await poster.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Navratri garba" }),
  ).toHaveCount(0);

  // It's on the public page, but not marked as confirmed by the mandir.
  await page.goto(`/mandirs/${SLUG}`);
  const event = page.getByRole("article").filter({ hasText: "Navratri garba" });
  await expect(event).toContainText("8pm");
  await expect(event).not.toContainText("Confirmed by the mandir");
});

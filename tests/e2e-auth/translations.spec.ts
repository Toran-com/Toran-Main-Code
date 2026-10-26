import { expect, test } from "@playwright/test";
import { logInAsAdmin, sql } from "./helpers";

// The Gujarati review pack: what's new since the last check, on screen,
// copied or printed, and marked as checked once the reviewer has replied.
test("Toran sends a reviewer only what's new in the Gujarati", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // "What's on" was checked when its Gujarati said something else.
  sql(`delete from public.translation_checks;
    insert into public.translation_checks (key, english, gujarati)
      values ('shell.whatsOn', 'What''s on', 'શું ચાલી રહ્યું છે');`);
  await logInAsAdmin(page, `gu-pack-${Date.now()}@example.com`);
  await page.goto("/ops/translations");

  const lines = page.getByRole("listitem");
  await expect(
    page.getByRole("link", { name: /^What's new \(\d+\)$/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    lines.filter({ hasText: "Toran home" }).getByText("New"),
  ).toBeVisible();
  const changed = lines.filter({ hasText: "Before: શું ચાલી રહ્યું છે" });
  await expect(changed.getByText("Changed")).toBeVisible();
  const number = (await changed.locator("span").first().innerText()).trim();

  // The printout keeps the same numbers.
  await page.getByRole("link", { name: /^Print these \d+ lines$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Gujarati wording to check" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Before: શું ચાલી રહ્યું છે" })
      .getByText(number, { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Back to Translations" }).click();

  await page
    .getByRole("button", { name: /^Mark the \d+ new lines as checked$/ })
    .click();
  await expect(page.getByText(/lines marked as checked/)).toBeVisible();
  await expect(
    page.getByText(/^All \d+ lines have been checked/),
  ).toBeVisible();
  // Visible ones only: the page as it was before stays in the document,
  // hidden, for going back.
  await expect(
    page.getByText("New", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Changed", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
});

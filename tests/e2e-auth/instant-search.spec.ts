import { expect, test } from "@playwright/test";

// Search with real mandirs: a typo still finds them, and the keyboard
// moves from the box through the results and back.

test("a typo still finds the mandir, and ↓ ↑ Esc move through results", async ({
  page,
}) => {
  await page.goto("/search");
  const box = page.getByLabel("Events, mandirs, towns or festivals");
  await box.pressSequentially("Leicster", { delay: 30 });
  await expect(page).toHaveURL(/q=Leicster/);
  await expect(page.getByText(/so these are close spellings/)).toBeVisible();
  const mandirs = page.getByRole("region", { name: /Mandirs/ });
  await expect(mandirs.getByRole("link").first()).toBeVisible();

  // ↓ from the box goes to the first result, and on down the list.
  await box.press("ArrowDown");
  const first = page.locator(":focus");
  await expect(first).toHaveAttribute("href", /^\/mandirs\//);
  const firstHref = await first.getAttribute("href");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).not.toHaveAttribute("href", firstHref!);
  // ↑ comes back up, and from the top into the box; Esc does too.
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(":focus")).toHaveAttribute("href", firstHref!);
  await page.keyboard.press("ArrowUp");
  await expect(box).toBeFocused();
  await box.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(box).toBeFocused();

  // Spelt right, it shows what matches as typed.
  await box.fill("Leicester");
  await expect(page).toHaveURL(/q=Leicester$/);
  await expect(page.getByText(/close spellings/)).toHaveCount(0);
});

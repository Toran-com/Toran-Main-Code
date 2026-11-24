import { expect, test } from "@playwright/test";

// The first-visit guide: what to expect at a mandir, in English, Gujarati
// and Hindi, leading on to the mandirs.
test("the first-visit guide explains a visit and leads to the mandirs", async ({
  page,
}) => {
  await page.goto("/first-visit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your first visit to a mandir",
  );
  for (const heading of [
    "When you arrive",
    "What to wear",
    "Aarti",
    "Prasad and food",
    "Photos",
    "Giving",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText("Take off your shoes")).toBeVisible();
  await page.getByRole("link", { name: "Find a mandir" }).click();
  await expect(page).toHaveURL(/\/mandirs$/);

  await page.goto("/gu/first-visit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "મંદિરની તમારી પહેલી મુલાકાત",
  );
  await page.goto("/hi/first-visit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "मंदिर की आपकी पहली यात्रा",
  );
});

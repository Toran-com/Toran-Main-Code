import { expect, test } from "@playwright/test";

// "Aa": bigger text and higher contrast, remembered on the phone and in
// place before the page is drawn.
test("text can be made bigger and higher in contrast, and stays so", async ({
  page,
}) => {
  await page.goto("/");
  const size = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  expect(await size()).toBe("18px");

  await page.getByLabel("Text size and contrast").click();
  await page.getByRole("button", { name: /Largest/ }).click();
  await expect(page.getByRole("button", { name: /Largest/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("switch", { name: "Higher contrast" }).click();
  expect(await size()).toBe("22.5px");

  // Another page, with the choice already applied as it's drawn.
  await page.goto("/festivals");
  expect(await size()).toBe("22.5px");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");

  // And back to standard.
  await page.getByLabel("Text size and contrast").click();
  await page.getByRole("button", { name: /Standard/ }).click();
  await page.getByRole("switch", { name: "Higher contrast" }).click();
  await page.reload();
  expect(await size()).toBe("18px");
  await expect(page.locator("html")).not.toHaveAttribute("data-contrast");
});

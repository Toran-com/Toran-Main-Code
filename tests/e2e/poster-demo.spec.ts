import { expect, test } from "@playwright/test";

// "Watch AI read a poster": reached from How Toran is built, shows the
// sample posters, and says plainly when reading is switched off (as it is
// in these tests, with no Anthropic key). The reading itself is tested in
// tests/unit/poster-demo.test.ts with a stand-in for Claude.

test("the poster demo shows the sample posters and says when it's off", async ({
  page,
}) => {
  await page.goto("/how-its-built");
  await page.getByRole("link", { name: "Watch it read a poster" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Watch AI read a poster" }),
  ).toBeVisible();

  const posters = page.getByRole("radio");
  await expect(posters).toHaveCount(3);
  await expect(page.getByRole("radio", { name: /Holi poster/ })).toBeChecked();
  await expect(
    page.getByRole("link", { name: "Open the Holi poster full size" }),
  ).toHaveAttribute("href", "/demo-posters/holi.jpg");

  await page.getByText("Gujarati patrika", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Gujarati patrika/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("link", { name: "Open the Gujarati patrika full size" }),
  ).toHaveAttribute("href", "/demo-posters/patrika.jpg");

  await expect(
    page.getByText(/Reading posters isn't switched on for this copy of Toran/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Read this poster/ }),
  ).toHaveCount(0);
});

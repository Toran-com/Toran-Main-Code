import { expect, test } from "@playwright/test";
import { logInAsAdmin } from "./helpers";

// Adding many mandirs at once: each pasted row is checked like the form,
// possible duplicates of listed mandirs are held back, and only the new
// ones are added.

test("paste mandirs, check them, add the new ones", async ({ page }) => {
  test.setTimeout(90_000);
  await logInAsAdmin(page, `import-${Date.now()}@example.com`);
  const name = `Shree Test Mandir ${Date.now()}`;

  await page.goto("/ops/mandirs");
  await page.getByRole("link", { name: "Add many" }).click();
  await page.getByLabel("Rows").fill(
    [
      "name\ttown\tregion\tpostcode\twebsite\tphone\ttradition",
      `${name}\tTestford\twales\tCF10 1AA\t\t\tSanatan`,
      // Geeta Bhavan Leicester is listed, at this postcode.
      "Geeta Bhavan\tLeicester\tEast Midlands\tLE2 3AD",
      "No region\tLeeds\tAtlantis\tLS1 1AA",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Check" }).click();
  const line = (n: number) =>
    page.getByRole("listitem").filter({ hasText: `Line ${n}` });
  await expect(line(2)).toContainText("New");
  await expect(line(3)).toContainText(
    "Possible duplicate: same postcode as Geeta Bhavan Leicester, Leicester",
  );
  await expect(line(4)).toContainText("The region must be one of");

  await page.getByRole("button", { name: "Add the 1 new mandir" }).click();
  await expect(page.getByText(/^Added 1 mandir/)).toBeVisible();
  await line(2).getByRole("link", { name: "Added" }).click();
  await expect(page).toHaveURL(
    /\/ops\/mandirs\/shree-test-mandir-\d+-testford$/,
  );

  // On the public list straight away.
  const slug = page.url().split("/").pop();
  await page.goto(`/mandirs/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

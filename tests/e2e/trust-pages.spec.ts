import { expect, test } from "@playwright/test";

// The pages about Toran itself: every public page's footer reaches them,
// the legal ones show the drafts from docs/legal, and anyone can ask for a
// correction without giving their name.

test("the footer reaches every page about Toran", async ({ page }) => {
  for (const [link, heading] of [
    ["About", "About Toran"],
    ["Contact", "Contact Toran"],
    ["Correct or remove something", "Correct or remove something"],
    ["Privacy", "Privacy notice"],
    ["Terms", "Terms of use"],
    ["Accessibility", "Accessibility"],
  ]) {
    await page.goto("/whats-on");
    await page
      .getByRole("navigation", { name: "Pages about Toran" })
      .getByRole("link", { name: link, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }
});

test("the privacy notice is shown from its draft, marked as a draft", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(page.getByText("This is a draft.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "The short version" }),
  ).toBeVisible();
  // The table of what committees' data is kept for.
  await expect(
    page.getByRole("columnheader", { name: "Lawful basis" }),
  ).toBeVisible();
  // Text still to fill in is highlighted, and no Markdown shows through.
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.locator("article")).not.toContainText("**");
  await page.getByRole("link", { name: "terms" }).first().click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("login and committee pages link to the privacy notice", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("navigation", { name: "About Toran" })
    .getByRole("link", { name: "Privacy" })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("a correction request says what's needed, and nothing about the sender", async ({
  page,
}) => {
  await page.goto("/corrections?page=%2Fmandirs%2Fsome-mandir");
  await expect(page.getByText("About this page:")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Something is wrong or out of date" }),
  ).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: /What should change/ }),
  ).toBeVisible();
  // No name, email or phone fields.
  await expect(page.locator("input[type=email], input[type=tel]")).toHaveCount(
    0,
  );
  await page
    .getByRole("radio", { name: "Hide a mandir's page (for its committee)" })
    .check();
  await page
    .getByRole("textbox", { name: /What should change/ })
    .fill("Our committee would rather not be listed.");
  await page.getByRole("button", { name: "Send" }).click();
  // No database in these tests: it says so, and keeps the page.
  await expect(page.getByText("That didn't send.")).toBeVisible();
  await expect(page).toHaveURL(/page=%2Fmandirs%2Fsome-mandir/);
});

test("a link to another site can't be slipped into the form", async ({
  page,
}) => {
  await page.goto("/corrections?page=https%3A%2F%2Fexample.org");
  await expect(page.getByText("About this page:")).toHaveCount(0);
});

test("the correction form holds back spam", async ({ page }, info) => {
  // Its own address (and a new one on a retry), so the limit doesn't
  // touch other tests.
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `203.0.113.${77 + info.retry}`,
  });
  const send = async (details: string) => {
    await page.goto("/corrections?page=%2F");
    await page
      .getByRole("textbox", { name: /What should change/ })
      .fill(details);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page).toHaveURL(/(error|sent)=/);
  };

  await send("See https://a.example, http://b.example and www.c.example");
  await expect(
    page.getByText("Please include no more than 2 web addresses."),
  ).toBeVisible();
  // Link markup only robots write: thanked, and dropped.
  await send("[url=https://cheap.example]cheap[/url]");
  await expect(page).toHaveURL(/sent=1/);
  // Five tries in ten minutes, then a pause.
  for (let i = 0; i < 3; i++) await send(`The phone number is wrong (${i})`);
  await expect(page.getByText("That didn't send.")).toBeVisible();
  await send("The phone number is wrong (again)");
  await expect(page.getByText("You've sent a few already.")).toBeVisible();
});

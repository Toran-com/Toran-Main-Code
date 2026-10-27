import { expect, test } from "@playwright/test";

// The page for mandir committees, linked from every public page.
test("committees can find out what Toran does for them", async ({ page }) => {
  await page.goto("/mandirs");
  await page.getByRole("link", { name: "For mandir committees" }).click();
  await expect(page).toHaveURL(/\/for-mandirs$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "For mandir committees",
  );
  await expect(
    page.getByRole("link", { name: "Try the example" }),
  ).toHaveAttribute("href", "/demo");
});

// The committee guide, and its one-page handout to print.
test("committees can read the guide and print the handout", async ({
  page,
}) => {
  await page.goto("/for-mandirs");
  await page.getByRole("link", { name: "Read the committee guide" }).click();
  await expect(page).toHaveURL(/\/for-mandirs\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Committee guide",
  );
  // The contents jump to each section.
  const contents = page.getByRole("navigation", { name: "In this guide" });
  await contents.getByRole("link", { name: "Seva rotas" }).click();
  await expect(page).toHaveURL(/#seva$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /Seva rotas/ }),
  ).toBeInViewport();

  await page.getByRole("link", { name: "Print a one-page handout" }).click();
  await expect(page).toHaveURL(/\/for-mandirs\/guide\/print$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your mandir's events on Toran",
  );
  await expect(page.getByRole("listitem")).toHaveCount(6);
  await expect(
    page.getByRole("img", { name: /QR code for .*\/for-mandirs\/guide$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Print this page" }),
  ).toBeVisible();
});

// "Create an account" from For mandirs: a choice between running a mandir
// and visiting (who don't need an account).
test("committees can create an account from For mandirs", async ({ page }) => {
  await page.goto("/for-mandirs");
  await page
    .getByRole("link", { name: "Create an account", exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Create an account",
  );
  await expect(
    page.getByRole("heading", { name: "I help run a mandir" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "I'm visiting mandirs" }),
  ).toBeVisible();
  await expect(page.getByText("You don't need an account.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open My Toran" }),
  ).toHaveAttribute("href", "/my");
  await expect(
    page.getByRole("link", { name: "Log in" }).last(),
  ).toHaveAttribute("href", "/login");
});

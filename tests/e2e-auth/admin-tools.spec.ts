import { expect, test, type Page } from "@playwright/test";
import {
  logInAsAdmin,
  openAdminTool,
  showMandirList,
  sql,
  stubMapTiles,
} from "./helpers";

async function setVisibility(
  page: Page,
  editPath: string,
  status: "listed" | "hidden",
) {
  await page.goto(editPath);
  await page.getByLabel("Shown to the public?").selectOption(status);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
}

// Toran admin tools against a real local Supabase. Uses mandirs no other
// test looks at, and puts everything back as it found it.

test("an admin edits, hides and adds mandirs, and checks festival dates", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await stubMapTiles(page);
  await logInAsAdmin(page, `ops-${Date.now()}@example.com`);

  // Find and edit a mandir.
  await openAdminTool(page, "Mandirs");
  await page.getByLabel("Search mandirs").fill("Reading");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: /Reading Hindu Temple/ }).click();
  await expect(page).toHaveURL(/\/ops\/mandirs\/reading-hindu-temple$/);
  await page.getByLabel("Tradition").fill("Sanatan");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText("Saved. The public page is updated."),
  ).toBeVisible();

  const publicPage = await page.context().newPage();
  await publicPage.goto("/mandirs/reading-hindu-temple");
  await expect(publicPage.getByText("Sanatan")).toBeVisible();

  // Hide it: the public page goes away, then comes back. Each save starts
  // from a fresh page, so "Saved." can only come from that save.
  await setVisibility(page, "/ops/mandirs/reading-hindu-temple", "hidden");
  const hidden = await publicPage.goto("/mandirs/reading-hindu-temple");
  expect(hidden?.status()).toBe(404);
  await setVisibility(page, "/ops/mandirs/reading-hindu-temple", "listed");
  const shown = await publicPage.goto("/mandirs/reading-hindu-temple");
  expect(shown?.status()).toBe(200);

  // Add a new mandir.
  await page.goto("/ops/mandirs/new");
  await page.getByLabel("Name").fill(`Test Mandir ${Date.now()}`);
  await page.getByLabel("Town").fill("Testtown");
  await page.getByLabel("Region").selectOption("Wales");
  await page.getByLabel("Postcode").fill("not a postcode");
  await page.getByRole("button", { name: "Add mandir" }).click();
  await expect(
    page.getByText("That doesn't look like a UK postcode."),
  ).toBeVisible();
  const name = `Test Mandir ${Date.now()}`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Town").fill("Testtown");
  await page.getByLabel("Region").selectOption("Wales");
  await page.getByRole("button", { name: "Add mandir" }).click();
  await expect(
    page.getByText("Added. It's on the public list now."),
  ).toBeVisible();
  await publicPage.goto("/mandirs");
  await showMandirList(publicPage);
  await expect(
    publicPage.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
  // Hide it again so other tests still see the starting 106.
  await setVisibility(page, new URL(page.url()).pathname, "hidden");

  // Festival dates: checking needs a source; then put it back.
  await openAdminTool(page, "Festival dates");
  const first = page
    .getByRole("listitem")
    .filter({ hasText: "Not yet checked" })
    .first();
  await first.getByLabel("Where you checked it").fill("Drik Panchang, London");
  await first.getByRole("button", { name: "Mark as checked" }).click();
  await expect(page.getByText("Marked as checked.")).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: "Drik Panchang, London" })
    .getByRole("button", { name: "Mark as not checked" })
    .click();
  await expect(page.getByText("Marked as not checked.")).toBeVisible();
});

test("an admin ticks mandirs' websites and scans them all", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // A site that can't be reached, so the scan is quick and touches no real
  // website (reading real sites is tested with a fake site instead:
  // tests/unit/website-check.test.ts).
  const slug = "hindu-temple-geeta-bhawan-derby";
  const before = sql(
    `select website from public.mandirs where slug = '${slug}'`,
  );
  sql(
    `update public.mandirs set website = 'http://127.0.0.1:9/' where slug = '${slug}'`,
  );
  await logInAsAdmin(page, `websites-${Date.now()}@example.com`);
  await openAdminTool(page, "Websites");
  await expect(page).toHaveURL(/\/ops\/websites$/);
  await expect(page.getByText("With a website")).toBeVisible();
  // Nothing ticked, nothing to scan.
  const scan = page.getByRole("button", { name: /^Scan the ticked websites/ });
  await expect(scan).toHaveText("Scan the ticked websites (0)");
  await expect(scan).toBeDisabled();
  // "All" and "None" tick and untick every one.
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(scan).not.toHaveText("Scan the ticked websites (0)");
  await page.getByRole("button", { name: "None", exact: true }).click();
  await expect(scan).toHaveText("Scan the ticked websites (0)");

  const name = sql(`select name from public.mandirs where slug = '${slug}'`);
  await page.getByRole("checkbox", { name: `Scan ${name}` }).check();
  await expect(scan).toHaveText("Scan the ticked websites (1)");
  await scan.click();
  const status = page.getByRole("status").filter({ hasText: "Scanned" });
  await expect(status).toContainText("Scanned 1 website.", {
    timeout: 60_000,
  });
  await expect(status).toContainText(name);
  // The check is recorded.
  expect(
    sql(
      `select count(*) from public.sources s join public.mandirs m on m.id = s.mandir_id
         where m.slug = '${slug}' and s.kind = 'crawler' and s.last_checked_at is not null`,
    ),
  ).toBe("1");
  sql(
    `update public.mandirs set website = ${before ? `'${before}'` : "null"} where slug = '${slug}'`,
  );
});

test("the admin pages are hidden from everyone else", async ({ page }) => {
  const response = await page.goto("/ops/mandirs");
  await expect(page).toHaveURL(/\/login\?next=%2Fops%2Fmandirs/);
  expect(response?.status()).toBeLessThan(500);
});

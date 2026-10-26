import { expect, test } from "@playwright/test";
import { logInAsAdmin, sql } from "./helpers";

// Visits are counted with no cookies, and Toran admins see the totals on
// /ops/stats. Uses a mandir no other test looks at.
const SLUG = "bharat-hindu-samaj-peterborough";
const PHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function views(path: string): number {
  return Number(
    sql(
      `select coalesce(sum(count), 0) from public.daily_counts
         where metric = 'view' and path = '${path}'`,
    ),
  );
}

test("visits are counted without cookies and shown to admins", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);
  const before = views(`/mandirs/${SLUG}`);

  // A visitor on a phone.
  const context = await browser.newContext({ userAgent: PHONE });
  const visitor = await context.newPage();
  await visitor.goto(`/mandirs/${SLUG}`);
  await expect.poll(() => views(`/mandirs/${SLUG}`)).toBe(before + 1);
  // No cookies were set for it.
  expect(await context.cookies()).toEqual([]);

  // A browser asking not to be tracked isn't counted.
  const private_ = await browser.newContext({
    userAgent: PHONE,
    extraHTTPHeaders: { "sec-gpc": "1" },
  });
  const quiet = await private_.newPage();
  await quiet.goto(`/mandirs/${SLUG}`);
  await quiet.waitForTimeout(1500);
  expect(views(`/mandirs/${SLUG}`)).toBe(before + 1);

  // Nor are admin pages, or made-up mandirs sent straight to the counter.
  const response = await visitor.request.post("/api/count", {
    data: JSON.stringify({ m: "view", p: "/mandirs/not-a-real-mandir" }),
    headers: { "user-agent": PHONE },
  });
  expect(response.status()).toBe(204);
  expect(views("/mandirs/not-a-real-mandir")).toBe(0);

  // The admin sees it.
  await logInAsAdmin(page, `stats-${Date.now()}@example.com`);
  await page.goto("/ops/stats?days=7");
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
  await expect(page.getByText("Page views", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Bharat Hindu Samaj" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Last 90 days" }).click();
  await expect(page).toHaveURL(/days=90/);

  // And today's figures, against yesterday's.
  await page.goto("/ops/today");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Page views today")).toBeVisible();
  await expect(page.getByText(/^Yesterday: \d/).first()).toBeVisible();

  await context.close();
  await private_.close();
});

import { expect, test } from "@playwright/test";
import { BUDGET, pageWeight } from "../speed";

// With real data the longest pages (every mandir, eight weeks of events)
// must stay light too. The HTML itself may grow with the list, so these
// allow 100 KB more than the empty pages.
for (const path of [
  "/mandirs",
  "/mandirs/geeta-bhavan-leicester",
  "/festivals",
  "/whats-on",
]) {
  test(`${path} with data stays within the speed budget`, async ({ page }) => {
    await page.goto(path);
    const weight = await pageWeight(page);
    expect(weight.js, `JavaScript on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.js,
    );
    expect(weight.total, `Everything on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.total + 100,
    );
  });
}

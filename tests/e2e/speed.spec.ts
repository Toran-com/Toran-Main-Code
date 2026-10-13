import { expect, test } from "@playwright/test";
import { BUDGET, pageWeight } from "../speed";

for (const path of ["/", "/mandirs", "/festivals", "/whats-on", "/login"]) {
  test(`${path} stays within the speed budget`, async ({ page }) => {
    await page.goto(path);
    const weight = await pageWeight(page);
    expect(weight.js, `JavaScript on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.js,
    );
    expect(weight.total, `Everything on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.total,
    );
  });
}

import { expect, test } from "@playwright/test";
import { BUDGET, MAP_JS, pageWeight } from "../speed";
import { stubMapTiles } from "./helpers";

// With real data the longest pages (every mandir, eight weeks of events)
// must stay light too. The HTML itself may grow with the list, so these
// allow 100 KB more than the empty pages. /mandirs opens on the map, which
// has its own JavaScript allowance (tests/speed.ts); its pictures are
// stubbed.
for (const path of [
  "/mandirs",
  "/mandirs/geeta-bhavan-leicester",
  "/festivals",
  "/whats-on",
]) {
  test(`${path} with data stays within the speed budget`, async ({ page }) => {
    await stubMapTiles(page);
    await page.goto(path);
    const weight = await pageWeight(page);
    const map = path === "/mandirs" ? MAP_JS : 0;
    expect(weight.js, `JavaScript on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.js + map,
    );
    expect(weight.total, `Everything on ${path} (KB)`).toBeLessThanOrEqual(
      BUDGET.total + 100 + map,
    );
  });
}

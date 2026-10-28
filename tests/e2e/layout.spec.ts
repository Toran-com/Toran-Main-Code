import { expect, test } from "@playwright/test";

// On a phone, no page should be wider than the screen: a page that slides
// sideways when you scroll feels broken.
for (const path of [
  "/",
  "/whats-on",
  "/seva",
  "/mandirs",
  "/festivals",
  "/diwali",
  "/plan",
  "/my",
  "/search?q=diwali",
  "/for-mandirs",
  "/for-mandirs/guide",
  "/join",
  "/login",
  "/demo",
  "/about",
  "/contact",
  "/gu",
  "/hi/whats-on",
]) {
  test(`${path} fits the screen`, async ({ page }) => {
    await page.goto(path);
    const { width, scroll } = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(
      scroll,
      `${path} is ${scroll - width}px too wide`,
    ).toBeLessThanOrEqual(width);
  });
}

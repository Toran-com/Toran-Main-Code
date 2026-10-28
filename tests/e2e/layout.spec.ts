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

// On a laptop, the main pages use the width of the screen rather than a
// narrow column down the middle, and fit it too.
test.describe("on a laptop", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false });

  for (const path of ["/whats-on", "/seva", "/diwali", "/mandirs", "/my"]) {
    test(`${path} uses the width of the screen`, async ({ page }) => {
      await page.goto(path);
      const { content, screen, scroll } = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        const widest = Math.max(
          ...[...main.children].map((c) => c.getBoundingClientRect().width),
        );
        return {
          content: widest,
          screen: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        };
      });
      expect(content, `${path} is only ${content}px wide`).toBeGreaterThan(
        screen * 0.85,
      );
      expect(scroll).toBeLessThanOrEqual(screen);
    });
  }

  test("the header has one button for committees", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "For mandir committees" }).first(),
    ).toBeVisible();
    // The phone's log-in icon gives way to it.
    await expect(
      page.getByRole("link", { name: "Committee log in" }),
    ).toBeHidden();
  });
});

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

// The smallest screen that has to work (320px: a small phone, or 400%
// zoom) with the largest text, in all three languages: Gujarati and Hindi
// words are longer, so the header and buttons must wrap, not spill.
test.describe("on a small phone with the largest text", () => {
  test.use({ viewport: { width: 320, height: 640 } });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("toran:display", JSON.stringify({ text: "xl" })),
    );
  });

  for (const path of [
    "/",
    "/whats-on",
    "/mandirs",
    "/my",
    "/gu",
    "/gu/whats-on",
    "/gu/my",
    "/hi",
    "/hi/whats-on",
    "/hi/festivals",
  ]) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-text", "xl");
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
});

// Hindi headings don't fetch the Gujarati font just for the danda (।),
// which both scripts share; Gujarati pages do need it.
test("Hindi pages don't download the Gujarati font", async ({ page }) => {
  const loaded = async () => {
    await page.waitForLoadState("networkidle");
    return page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => f.family.replace(/"/g, "")),
    );
  };
  await page.goto("/hi");
  expect(await loaded()).not.toContain("Noto Serif Gujarati");
  await page.goto("/gu");
  expect(await loaded()).toContain("Noto Serif Gujarati");
});

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

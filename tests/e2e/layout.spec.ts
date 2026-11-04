import { expect, test } from "@playwright/test";
import { expectAccessible } from "../a11y";

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

// On a phone, the main places are in a bar along the bottom, each with a
// picture and its name, and the header is one row: the name, Search and
// Menu. The bar never hides the end of the page.
test("on a phone, the main places are along the bottom", async ({ page }) => {
  await page.goto("/");
  // (Next.js keeps the page before hidden, so only the one showing.)
  const bar = page.locator(".tab-bar:visible");
  await expect(bar).toBeVisible();
  for (const name of ["What's on", "Mandirs", "Festivals", "My Toran"]) {
    await expect(bar.getByRole("link", { name })).toBeVisible();
  }
  await bar.getByRole("link", { name: "Festivals" }).click();
  await expect(page).toHaveURL(/\/festivals$/);
  await expect(bar.getByRole("link", { name: "Festivals" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // The footer's last link can be seen above the bar.
  await page.keyboard.press("End");
  const footerEnd = await page
    .locator("footer a")
    .last()
    .evaluate((a) => a.getBoundingClientRect().bottom);
  const barTop = await bar.evaluate((b) => b.getBoundingClientRect().top);
  expect(footerEnd).toBeLessThanOrEqual(barTop);

  // The menu covers the screen, with the bar out of the way, and closes.
  await page.locator("summary:visible", { hasText: "Menu" }).click();
  const menu = page.getByRole("group", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Seva" })).toBeVisible();
  await expect(bar).toBeHidden();
  await expectAccessible(page);
  await menu.getByRole("button", { name: "Close" }).click();
  await expect(menu).toBeHidden();
  await expect(bar).toBeVisible();
  // And closes by itself on going to another page.
  await page.locator("summary:visible", { hasText: "Menu" }).click();
  await menu.getByRole("link", { name: "Mandirs" }).click();
  await expect(page).toHaveURL(/\/mandirs$/);
  await expect(menu).toBeHidden();
});

// The scroll animation moves things but never fades them: text caught
// halfway in at the edge of the screen must still be at full contrast.
test("scrolling never leaves text faded", async ({ page }) => {
  for (const path of ["/", "/festivals", "/whats-on"]) {
    await page.goto(path);
    await page.mouse.wheel(0, 300);
    const faded = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal")]
        .map((el) => getComputedStyle(el).opacity)
        .filter((o) => o !== "1"),
    );
    expect(faded, `${path} has faded .reveal elements`).toEqual([]);
  }
});

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

  test("the header is one row, with the rest in the menu", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    const main = header.getByRole("navigation", { name: "Main" });
    for (const name of ["What's on", "Seva", "Mandirs", "Festivals"]) {
      await expect(main.getByRole("link", { name })).toBeVisible();
    }
    await expect(header.getByRole("link", { name: "My Toran" })).toBeVisible();
    // No bar along the bottom on a laptop.
    await expect(page.locator(".tab-bar")).toBeHidden();
    // Committees, text size and the rest are in the menu.
    await expect(
      header.getByRole("link", { name: "Committee log in" }),
    ).toBeHidden();
    await page.locator("summary:visible", { hasText: "Menu" }).click();
    const menu = page.getByRole("group", { name: "Menu" });
    await expect(
      menu.getByRole("link", { name: "For mandir committees" }),
    ).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Committee log in" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

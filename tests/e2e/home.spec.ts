import { expect, test } from "@playwright/test";

test("home page shows the coming soon message", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Toran/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What's on at mandirs near you",
  );
  await expect(page.getByText("Coming soon")).toBeVisible();
  // The quick links go straight to What's on, filtered.
  await page
    .getByRole("navigation", { name: "Type of event" })
    .getByRole("link", { name: "Festival" })
    .click();
  await expect(page).toHaveURL(/\/whats-on\?type=festival$/);
});

test("the main button goes to What's on, asking where you are the first time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find events near me" }).click();
  await expect(page).toHaveURL(/\/whats-on\?pick=1$/);
  await expect(
    page.getByRole("dialog", { name: "Where are you?" }),
  ).toBeVisible();
  // Once a place is chosen, it goes straight there.
  await page.evaluate(() =>
    localStorage.setItem("toran:place", '{"near":"LE4","within":15}'),
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Find events near me" }).click();
  await expect(page).toHaveURL(/\/whats-on\?near=LE4/);
});

test("text is at least 18px", async ({ page }) => {
  await page.goto("/");
  const size = await page
    .getByText("Events and seva at UK mandirs")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

test("shared links get a preview picture", async ({ page, request }) => {
  await page.goto("/");
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toBeTruthy();
  const response = await request.get(new URL(image!).pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
});

test("“See how Toran works” changes the laptop's phone as you scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const story = page.locator(".story");
  await expect(
    page.getByRole("heading", { level: 2, name: "See how Toran works" }),
  ).toBeVisible();
  // Every step says in words what its button does, with a way to try it.
  const steps = page.locator("[data-story-step]");
  await expect(steps).toHaveCount(6);
  await expect(
    steps.nth(3).getByRole("link", { name: "Find your mandir" }),
  ).toHaveAttribute("href", "/mandirs");

  // Bring the fourth step into view: the phone shows a mandir to follow,
  // and only that screen.
  const stage = page.locator(".story-stage");
  await steps.nth(3).locator("h3").scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-active", "3");
  await expect(stage.locator('[data-screen="3"]')).toBeVisible();
  for (const other of [0, 1, 2, 4, 5]) {
    await expect(stage.locator(`[data-screen="${other}"]`)).toBeHidden();
  }
  // The phone is a picture: screen readers get the steps' words instead.
  await expect(stage).toHaveAttribute("aria-hidden", "true");
});

test("on a laptop, each scroll moves “See how Toran works” one step, then the page goes on", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const story = page.locator(".story");
  // No dots that look like buttons.
  await expect(page.locator(".story-dot")).toHaveCount(0);
  // A way past the steps for anyone who doesn't want them.
  await expect(
    page.getByRole("link", { name: "Skip the steps" }),
  ).toHaveAttribute("href", "#story-end");
  await expect(page.locator("#story-end")).toHaveCount(1);

  // Bring the box fully into view, with the mouse over it.
  await story.evaluate((el) =>
    window.scrollTo(
      0,
      el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight,
    ),
  );
  const box = (await story.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const step = () =>
    story.evaluate((el) => Math.round(el.scrollTop / el.clientHeight));
  await expect.poll(step).toBe(0);

  // However hard the flick, one step, and more scrolling straight after
  // it (its glide running on) is held back.
  await page.mouse.wheel(0, 3000);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(900);
  expect(await step()).toBe(1);
  await expect(story).toHaveAttribute("data-active", "1");
  // A fresh scroll on a trackpad (many small movements in a row) is one
  // step: they add up until they count, then the rest is held back.
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(900);
  expect(await step()).toBe(2);

  // To the last step, then the page scrolls on past it.
  for (const n of [3, 4, 5]) {
    await page.waitForTimeout(700);
    await page.mouse.wheel(0, 100);
    await expect.poll(step).toBe(n);
  }
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(before);
});

test("on a phone, each step of “See how Toran works” has its own phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await expect(page.locator(".story-stage")).toBeHidden();
  const steps = page.locator("[data-story-step]");
  for (let i = 0; i < 6; i++) {
    const step = steps.nth(i);
    await step.scrollIntoViewIfNeeded();
    // Its own screen, and no other.
    await expect(step.locator(`[data-screen="${i}"]`)).toBeVisible();
    await expect(step.locator("[data-screen]")).toHaveCount(1);
    // The phone never covers the step's words.
    const phone = await step.locator(".story-phone").boundingBox();
    const title = await step.locator("h3").boundingBox();
    expect(phone!.y + phone!.height).toBeLessThanOrEqual(title!.y);
  }
});

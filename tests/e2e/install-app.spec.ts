import { expect, test } from "@playwright/test";

// Toran can be added to a phone's home screen, and pages already opened
// still work without signal.

test("the app has a manifest and icons", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    short_name: "Toran",
    start_url: "/",
    display: "standalone",
  });
  const icons = [
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"),
  ];
  for (const src of icons) {
    const response = await request.get(src);
    expect(response.status(), src).toBe(200);
    expect(response.headers()["content-type"], src).toBe("image/png");
  }
  await expect(
    page.locator('meta[name="theme-color"]').first(),
  ).toHaveAttribute("content", /^#/);
});

test("pages already opened work offline; others say you're offline", async ({
  page,
  context,
}) => {
  await page.goto("/whats-on");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Now the app is running, opening pages keeps a copy of them; logging in
  // is never kept.
  await page.goto("/whats-on");
  await page.goto("/");
  await page.goto("/login");
  const kept = await page.evaluate(async () => {
    const cache = await caches.open("toran-pages-v1");
    return (await cache.keys()).map((r) => new URL(r.url).pathname).sort();
  });
  expect(kept).toEqual(["/", "/offline", "/whats-on"]);

  // No signal: every request fails, including the app's own.
  await context.setOffline(true);
  await context.route("**", (route) => route.abort("internetdisconnected"));
  await page.goto("/whats-on");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's on");
  for (const path of ["/for-mandirs", "/login"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(
      "You're offline",
    );
  }
});

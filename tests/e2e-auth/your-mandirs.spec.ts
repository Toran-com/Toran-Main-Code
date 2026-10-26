import { expect, test } from "@playwright/test";

// A mandir followed on this phone shows on the home page with its next
// event, and its page is kept for use without signal, apart from the
// pages that get pushed out as others are opened.
const SLUG = "geeta-bhavan-leicester";
const NAME = "Geeta Bhavan Leicester";

test("followed mandirs show on the home page and open offline", async ({
  page,
  context,
}) => {
  await page.goto(`/mandirs/${SLUG}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Now the app is running.
  await page.reload();
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

  await page.goto("/");
  const yours = page.getByRole("region", { name: "Your mandirs" });
  await expect(yours.getByRole("link", { name: NAME })).toHaveAttribute(
    "href",
    `/mandirs/${SLUG}`,
  );
  await expect(
    yours.getByRole("link", { name: "All their events →" }),
  ).toHaveAttribute("href", `/whats-on?mandirs=${SLUG}`);

  // Kept apart from the other pages.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("toran-followed-v1");
        return (await cache.keys()).map((r) => new URL(r.url).pathname);
      }),
    )
    .toEqual([`/mandirs/${SLUG}`]);
  await page.evaluate(() => caches.delete("toran-pages-v1"));

  await context.setOffline(true);
  await context.route("**", (route) => route.abort("internetdisconnected"));
  await page.goto(`/mandirs/${SLUG}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(NAME);
});

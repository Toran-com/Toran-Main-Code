import { expect, type Page, test } from "@playwright/test";
import { hasTranslation, localeOfPath, withLocale } from "../../lib/i18n/paths";

// Before the pilot: the public site with real data, in English, Gujarati
// and Hindi. Every main page opens without an error in the browser, every
// link between Toran's pages works, and the Gujarati and Hindi pages keep
// visitors in their language wherever there's a page in it to go to.

const PAGES = [
  "/",
  "/whats-on",
  "/seva",
  "/mandirs",
  "/festivals",
  "/diwali",
  "/plan",
  "/search?q=diwali",
  "/for-mandirs",
  "/for-mandirs/guide",
  "/about",
  "/privacy",
  "/accessibility",
];

// Links on these pages that aren't pages to visit.
const SKIP = /^\/(api|_next)\/|\.(ics|xml|txt|png|jpg|webmanifest)(\?|$)/;
const MAX_LINKS = 400;

// The language switch (marked with hreflang) goes to another language on
// purpose; pass `"a[href]:not([hreflang])"` to leave it out.
async function internalLinks(
  page: Page,
  selector = "a[href]",
): Promise<string[]> {
  const hrefs = await page
    .locator(selector)
    .evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
  return hrefs
    .filter((h) => h.startsWith("/") && !h.startsWith("//"))
    .map((h) => h.split("#")[0])
    .filter((h) => h && !SKIP.test(h));
}

test("every page opens and every link between pages works, in both languages", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));

  // One mandir and one event with real data, found the way a visitor
  // would: from What's on.
  await page.goto("/whats-on");
  const eventHref = await page
    .locator('a[href^="/mandirs/"][href*="/events/"]')
    .first()
    .getAttribute("href");
  expect(eventHref, "What's on lists an event").toBeTruthy();
  const mandirHref = eventHref!.split("/events/")[0];

  const pages = [...PAGES, mandirHref, eventHref!];
  const translated = (["gu", "hi"] as const).flatMap((locale) =>
    pages.filter((p) => hasTranslation(p)).map((p) => withLocale(p, locale)),
  );

  const links = new Set<string>();
  const stayEnglish: string[] = [];
  for (const path of [...pages, ...translated]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    for (const link of await internalLinks(page)) links.add(link);
    // On a Gujarati or Hindi page, a link to a page that has a version in
    // that language should go to it (the language switch aside).
    const locale = localeOfPath(path);
    if (locale === "en") continue;
    for (const link of await internalLinks(page, "a[href]:not([hreflang])")) {
      if (localeOfPath(link) !== locale && hasTranslation(link)) {
        stayEnglish.push(`${path} → ${link}`);
      }
    }
  }

  expect(errors, "errors in the browser").toEqual([]);
  expect(
    stayEnglish,
    "Gujarati or Hindi pages linking to English ones",
  ).toEqual([]);

  const broken: string[] = [];
  const toCheck = [...links].slice(0, MAX_LINKS);
  for (let i = 0; i < toCheck.length; i += 8) {
    await Promise.all(
      toCheck.slice(i, i + 8).map(async (link) => {
        const response = await request.get(link);
        if (response.status() >= 400)
          broken.push(`${link} (${response.status()})`);
      }),
    );
  }
  expect(broken, "links that don't work").toEqual([]);
  expect(links.size, "links found").toBeGreaterThan(50);
});

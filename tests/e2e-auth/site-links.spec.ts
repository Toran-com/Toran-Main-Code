import { expect, type Page, test } from "@playwright/test";
import { hasGujarati } from "../../lib/i18n/paths";

// Before the pilot: the public site with real data, in English and in
// Gujarati. Every main page opens without an error in the browser, every
// link between Toran's pages works, and the Gujarati pages keep visitors
// in Gujarati wherever there's a Gujarati page to go to.

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

async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator("a[href]")
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
  const gujarati = pages
    .filter((p) => hasGujarati(p))
    .map((p) => (p === "/" ? "/gu" : `/gu${p}`));

  const links = new Set<string>();
  const stayEnglish: string[] = [];
  for (const path of [...pages, ...gujarati]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    for (const link of await internalLinks(page)) {
      links.add(link);
      // On a Gujarati page, a link to a page that has a Gujarati version
      // should go to it.
      if (
        path.startsWith("/gu") &&
        !link.startsWith("/gu") &&
        hasGujarati(link)
      ) {
        stayEnglish.push(`${path} → ${link}`);
      }
    }
  }

  expect(errors, "errors in the browser").toEqual([]);
  expect(stayEnglish, "Gujarati pages linking to English ones").toEqual([]);

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

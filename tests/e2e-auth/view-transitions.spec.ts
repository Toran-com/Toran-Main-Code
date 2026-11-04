import { expect, type Page, test } from "@playwright/test";
import { sql } from "./helpers";

// Going from a list to an event's or a mandir's page, its date and name
// move into place (components/morph.tsx). This checks the browser really
// pairs them up: it records which parts of the page each view transition
// animated.
const SLUG = "colchester-hindu-society";

async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { moved: string[][] };
    w.moved = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((update: never) => {
      const transition = start(update);
      const names: string[] = [];
      w.moved.push(names);
      transition.ready
        .then(() => {
          for (const animation of document.getAnimations()) {
            const pseudo = (animation.effect as KeyframeEffect | null)
              ?.pseudoElement;
            if (pseudo?.startsWith("::view-transition-group(")) {
              names.push(pseudo.slice(24, -1));
            }
          }
        })
        .catch(() => {});
      return transition;
    }) as typeof document.startViewTransition;
  });
}

const moved = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { moved: string[][] }).moved.flat(),
  );

test("an event's date and name move from a list into its own page", async ({
  page,
}) => {
  const title = `Kirtan evening ${Date.now()}`;
  const id = sql(
    `insert into public.events (mandir_id, title, kind, starts_at, status)
       select id, '${title}', 'bhajan',
              date_trunc('day', now() + interval '3 days') + interval '19 hours',
              'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
  await recordTransitions(page);
  // A family's plan lists events with the same cards as What's on, and
  // (unlike the mandir's page, which is kept for a while) shows a new
  // event straight away.
  await page.goto(`/plan?events=${id}`);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect
    .poll(() => moved(page))
    .toEqual(expect.arrayContaining([`event-${id}-date`, `event-${id}-title`]));
  // The header stays where it is.
  expect(await moved(page)).not.toContain("site-header");
});

test("a mandir's name moves from the list into its page", async ({ page }) => {
  await recordTransitions(page);
  await page.goto("/mandirs");
  await page.getByRole("button", { name: "List" }).click();
  await page
    .getByRole("link", { name: /Colchester Hindu Society/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Colchester Hindu Society",
  );
  await expect.poll(() => moved(page)).toContain(`mandir-${SLUG}`);
});

// How long each part of a page change animates for, from a change made
// on the spot (only the change's own animations, not the page's).
const changeDurations = (page: Page) =>
  page.evaluate(async () => {
    const transition = document.startViewTransition(() => {});
    await transition.ready;
    return document
      .getAnimations()
      .filter((a) =>
        (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
          "::view-transition",
        ),
      )
      .map((a) => Number(a.effect?.getComputedTiming().duration ?? 0));
  });

test("nothing moves when the phone asks for less motion", async ({ page }) => {
  await page.goto(`/mandirs/${SLUG}`);
  // Normally the page fades from one to the next.
  expect((await changeDurations(page)).some((d) => d > 0)).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect((await changeDurations(page)).filter((d) => d > 0)).toEqual([]);
});

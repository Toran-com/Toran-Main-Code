import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// "Read aloud" uses the phone's own voice. Test browsers have none, so a
// stand-in gives the page one. Uses a mandir no other test looks
// at; the event is added straight to the database.
const SLUG = "luton-hindu-mandir-shree-sanatan-seva-samaj";

function standInVoice(langs: string[]) {
  return `(() => {
    window.__spoken = [];
    const voices = ${JSON.stringify(langs)}.map((lang) => ({ lang, name: lang }));
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        speak: (u) => window.__spoken.push({ text: u.text, lang: u.lang }),
        cancel() {},
        addEventListener() {},
        removeEventListener() {},
      },
    });
  })()`;
}

// Switched off for now (READ_ALOUD_ON in lib/read-aloud.ts): phones' own
// voices sound too robotic. Even with a voice for the page's language,
// there's no button on an event's page or a mandir's.
test("read aloud is switched off for now", async ({ browser }) => {
  const title = `Hanuman Jayanti ${Date.now()}`;
  const id = sql(
    `insert into public.events (mandir_id, title, title_gu, summary, starts_at, status)
       select id, '${title}', 'હનુમાન જયંતી', 'Sundarkand path and prasad.',
         date_trunc('day', now() + interval '6 days') + interval '18 hours',
         'published'
       from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
  const path = `/mandirs/${SLUG}/events/${id}`;

  const context = await browser.newContext();
  await context.addInitScript(standInVoice(["en-GB", "gu-IN"]));
  const page = await context.newPage();
  for (const [address, button] of [
    [path, "Read aloud"],
    [`/gu${path}`, "મોટેથી વાંચો"],
    [`/mandirs/${SLUG}`, "Read aloud"],
  ]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: button })).toHaveCount(0);
  }
  await context.close();
});

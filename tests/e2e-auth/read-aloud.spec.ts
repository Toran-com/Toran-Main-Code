import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// "Read aloud" uses the phone's own voice. Test browsers have none, so a
// stand-in records what would be said. Uses a mandir no other test looks
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

test("an event's page can be read aloud, in English or Gujarati", async ({
  browser,
}) => {
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

  const english = await browser.newContext();
  await english.addInitScript(standInVoice(["en-GB", "gu-IN"]));
  const page = await english.newPage();
  await page.goto(path);
  await page.getByRole("button", { name: "Read aloud" }).click();
  const spoken = await page.evaluate(
    () => (window as unknown as { __spoken: { text: string }[] }).__spoken,
  );
  const said = spoken.map((s) => s.text).join(" ");
  expect(said).toContain(`${title}.`);
  expect(said).toMatch(
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d+ \w+, 6pm/,
  );
  expect(said).toContain("Sundarkand path and prasad.");

  await page.goto(`/gu${path}`);
  await page.getByRole("button", { name: "મોટેથી વાંચો" }).click();
  const gujarati = await page.evaluate(
    () =>
      (window as unknown as { __spoken: { text: string; lang: string }[] })
        .__spoken,
  );
  expect(gujarati[0]).toEqual({ text: "હનુમાન જયંતી.", lang: "gu-IN" });
  await english.close();

  // No voice for the page's language: no button.
  const noGujarati = await browser.newContext();
  await noGujarati.addInitScript(standInVoice(["en-GB"]));
  const other = await noGujarati.newPage();
  await other.goto(`/gu${path}`);
  await expect(other.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(other.getByRole("button", { name: "મોટેથી વાંચો" })).toHaveCount(
    0,
  );
  await noGujarati.close();
});

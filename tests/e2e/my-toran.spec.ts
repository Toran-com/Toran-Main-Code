import { expect, test } from "@playwright/test";

// My Toran (/my) without a database: everything on it comes from the
// phone, so it works (without names) even when Toran can't be reached.

const SLUG = "shree-example-mandir-leicester";
const PAST = "44444444-4444-4444-8444-444444444444";

test("an empty phone gets a way in to each part", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "My Toran" }).first().click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My Toran");
  const parts = page.getByRole("navigation", { name: "Parts of My Toran" });
  for (const name of ["Coming up", "My mandirs", "My seva", "Past events"]) {
    await expect(
      parts.getByRole("link", { name: new RegExp(name) }),
    ).toBeVisible();
  }
  await parts.getByRole("link", { name: /My seva/ }).click();
  await expect(page).toHaveURL(/#seva$/);
  await expect(page.getByText(/No seva yet/)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "My seva" })
      .getByRole("link", { name: "Find seva →" }),
  ).toHaveAttribute("href", "/seva");
});

test("seva done and past events are kept, and move to a new phone", async ({
  page,
  browser,
}) => {
  await page.goto("/my");
  await page.evaluate(
    ({ slug, past }) => {
      const year = new Date().getUTCFullYear();
      const at = (m: number, h: number) =>
        new Date(Date.UTC(year, 0, 1 + m, h)).toISOString();
      // A shift a while ago, still among the taken slots: it goes into the
      // record of seva done.
      localStorage.setItem(
        "toran:seva-slots",
        JSON.stringify([
          {
            slot: "slot-1",
            shift: "shift-1",
            event: "event-1",
            role: "Kitchen",
            label: "Sat, 6pm–9pm",
            title: "Navratri garba",
            place: "Shree Example Mandir, Leicester",
            path: `/mandirs/${slug}/events/${past}/seva`,
            starts_at: at(0, 17),
            ends_at: at(0, 20),
          },
        ]),
      );
      localStorage.setItem(
        "toran:been",
        JSON.stringify([{ id: past, at: at(0, 18) }]),
      );
    },
    { slug: SLUG, past: PAST },
  );
  await page.reload();

  const seva = page.getByRole("region", { name: "My seva" });
  await expect(seva.getByText("Seva you've done")).toBeVisible();
  await expect(seva.getByText("Kitchen ·")).toBeVisible();
  await expect(seva.getByText("3 hours")).toBeVisible();

  // Without the database, the event has no name yet, but can be answered.
  const past = page.getByRole("region", { name: "Past events" });
  await past.getByRole("button", { name: /^Yes, I went to/ }).click();
  await expect(past.getByText("Events you've been to")).toBeVisible();
  const year = page.getByRole("region", { name: "This year" });
  await expect(year.getByText("seva shifts")).toBeVisible();

  // Moving phones: the link in the WhatsApp message.
  const send = page.getByRole("link", { name: "Send to myself on WhatsApp" });
  const message = decodeURIComponent(
    (await send.getAttribute("href"))!.replace("https://wa.me/?text=", ""),
  );
  const link = message.match(/(\/my#move=\S+)/)![1];
  const other = await browser.newPage();
  await other.goto(link);
  const offer = other.getByRole("region", { name: "Add this to your Toran?" });
  await expect(offer).toContainText("Events: 1 · Seva shifts: 1");
  await offer.getByRole("button", { name: "Add to this phone" }).click();
  await expect(other.getByText("Added to this phone.")).toBeVisible();
  await expect(other).toHaveURL(/\/my$/);
  await expect(
    other.getByRole("region", { name: "My seva" }).getByText("Kitchen ·"),
  ).toBeVisible();
  await other.close();

  // And clearing it all.
  await page
    .getByRole("button", { name: "Clear everything on this phone" })
    .click();
  await page.getByRole("button", { name: "Yes, clear it all" }).click();
  await expect(
    page.getByText(/This phone has nothing saved now/),
  ).toBeVisible();
  await expect(page.getByText(/No seva yet/)).toBeVisible();
});

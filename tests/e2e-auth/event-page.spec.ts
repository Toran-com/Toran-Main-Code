import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// Every event has its own page. Events are added straight to the database
// here; adding one as a committee and following it to its page is covered
// in mandir-admin.spec.ts. Uses a mandir no other test looks at.
const SLUG = "colchester-hindu-society";

function addEvent(fields: string, values: string): string {
  return sql(
    `insert into public.events (mandir_id, ${fields})
       select id, ${values} from public.mandirs where slug = '${SLUG}'
       returning id`,
  );
}

test("an event's page has its details, sharing and search engine data", async ({
  page,
  request,
}) => {
  const title = `Sharad Purnima Garba ${Date.now()}`;
  const id = addEvent(
    "title, title_gu, kind, summary, starts_at, ends_at, cost_note, status, confirmed_at",
    `'${title}', 'શરદ પૂર્ણિમા ગરબા', 'festival', 'Garba under the full moon. All welcome.',
     date_trunc('day', now() + interval '7 days') + interval '18 hours 30 minutes',
     date_trunc('day', now() + interval '7 days') + interval '22 hours',
     'Free', 'published', now()`,
  );
  const path = `/mandirs/${SLUG}/events/${id}`;
  await page.goto(path);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator('[lang="gu"]').first()).toHaveText(
    "શરદ પૂર્ણિમા ગરબા",
  );
  const details = page.locator("dl");
  await expect(details).toContainText(/When.*–/);
  await expect(details).toContainText("Colchester");
  await expect(details).toContainText("Free");
  await expect(
    details.getByRole("link", { name: "Directions" }),
  ).toHaveAttribute("href", /google\.com\/maps/);
  await expect(page.getByText("Garba under the full moon.")).toBeVisible();
  await expect(page.getByText(/Confirmed by the mandir/)).toBeVisible();

  // Shared links point back at this page.
  const whatsApp = await page
    .getByRole("link", { name: "WhatsApp" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsApp!)).toContain(path);
  await page.getByText("Add to calendar").click();
  await expect(
    page.getByRole("link", { name: "Google Calendar" }),
  ).toHaveAttribute("href", `/mandirs/${SLUG}/add-to-calendar?event=${id}`);

  // Link previews and search engines.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${path}$`),
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    new RegExp(title),
  );
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const png = await request.get(new URL(image!).pathname);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toBe("image/png");
  const data = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).map((text) => JSON.parse(text));
  const event = data.find((d) => d["@type"] === "Event");
  expect(event).toMatchObject({
    name: title,
    url: expect.stringMatching(new RegExp(`${path}$`)),
    location: { name: "Colchester Hindu Society" },
  });
  expect(data.find((d) => d["@type"] === "BreadcrumbList")).toBeTruthy();
});

test("a finished event explains it's over", async ({ page }) => {
  const id = addEvent(
    "title, starts_at, status",
    `'Last year''s Diwali mela', now() - interval '30 days', 'published'`,
  );
  await page.goto(`/mandirs/${SLUG}/events/${id}`);
  await expect(page.getByText("This event has finished.")).toBeVisible();
  await expect(page.getByText("Add to calendar")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("unknown, unpublished and mismatched events aren't found", async ({
  request,
}) => {
  const draft = addEvent(
    "title, starts_at, status",
    `'Not ready yet', now() + interval '7 days', 'draft'`,
  );
  const elsewhere = addEvent(
    "title, starts_at, status",
    `'Colchester only', now() + interval '7 days', 'published'`,
  );
  for (const path of [
    `/mandirs/${SLUG}/events/00000000-0000-0000-0000-000000000000`,
    `/mandirs/${SLUG}/events/not-an-id`,
    `/mandirs/${SLUG}/events/${draft}`,
    `/mandirs/geeta-bhavan-leicester/events/${elsewhere}`,
    `/mandirs/no-such-mandir/events/${elsewhere}`,
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

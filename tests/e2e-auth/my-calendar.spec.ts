import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// My Toran's "All your mandirs in your calendar": one calendar with every
// event at the mandirs followed, which mandirs being in its address. Uses
// mandirs no other test looks at.
const ONE = "edinburgh-hindu-mandir-and-cultural-centre";
const TWO = "gita-bhavan-hindu-temple-manchester";

test("one calendar link for every mandir followed", async ({
  page,
  request,
}) => {
  const title = `Calendar test kirtan ${Date.now()}`;
  sql(
    `insert into public.events (mandir_id, title, starts_at, status)
       select id, '${title}', now() + interval '5 days', 'published'
       from public.mandirs where slug = '${ONE}'`,
  );

  for (const slug of [ONE, TWO]) {
    await page.goto(`/mandirs/${slug}`);
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();
  }
  await page.goto("/my");
  await expect(
    page.getByText("All your mandirs in your calendar"),
  ).toBeVisible();
  const apple = page.getByRole("link", { name: "Apple or Outlook calendar" });
  const href = (await apple.getAttribute("href")) ?? "";
  expect(href).toMatch(/^webcal:\/\/[^/]+\/my\/calendar\.ics\?m=/);
  const m = new URL(href.replace(/^webcal:/, "http:")).searchParams.get("m");
  expect(m?.split(",").sort()).toEqual([ONE, TWO].sort());

  const ics = await request.get(`/my/calendar.ics?m=${ONE},${TWO}`);
  expect(ics.status()).toBe(200);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain("My mandirs · Toran");
  expect(body).toContain(title);

  // No mandirs, or made-up ones only: nothing to subscribe to.
  expect((await request.get("/my/calendar.ics")).status()).toBe(404);
  const madeUp = await request.get("/my/calendar.ics?m=not-a-real-mandir");
  expect(await madeUp.text()).not.toContain("BEGIN:VEVENT");
});

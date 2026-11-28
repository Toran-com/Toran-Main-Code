import { expect, test, type Page } from "@playwright/test";
import { logIn, sql } from "./helpers";

// Add events → Connect your website → For web developers.
async function developerKeys(page: Page) {
  await page.getByRole("button", { name: "Add events", exact: true }).click();
  await page.getByRole("button", { name: /^Connect your website/ }).click();
  const sheet = page.locator("dialog[open]");
  await sheet.getByText("For web developers").click();
  await expect(sheet.getByLabel("What it's for")).toBeVisible();
  return sheet;
}

// The events API (decision 0032): a committee makes a key, the mandir's
// own system puts an event on its page with it, changes it, lists it and
// takes it off; a stopped key no longer works. Uses a mandir no other test
// looks at.
const SLUG = "chelmsford-sri-srinivasa-perumal-temple";
const ID = "e2e-api-diwali";
const TITLE = "E2E API Lakshmi puja";

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("a mandir's own system puts its events on Toran with a key", async ({
  page,
  request,
}) => {
  const email = `api-${Date.now()}@example.com`;
  await logIn(page, email);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );
  sql(`update public.mandirs set status = 'claimed' where slug = '${SLUG}'`);
  sql(`delete from public.events where title like 'E2E API%'`);

  await page.goto(`/manage/${SLUG}`);
  let sheet = await developerKeys(page);
  await expect(
    sheet.getByRole("link", { name: /instructions for your web developer/ }),
  ).toHaveAttribute("href", "/for-mandirs/events-api");
  await sheet.getByLabel("What it's for").fill("Our website");
  await sheet.getByRole("button", { name: "Make a key" }).click();
  const key = (await sheet.getByTestId("new-api-key").textContent())!.trim();
  expect(key).toMatch(/^toran_[A-Za-z0-9_-]{43}$/);
  // Only a hash is kept.
  expect(
    sql(
      `select count(*) from public.mandir_api_keys where key_hash = '${key}'`,
    ),
  ).toBe("0");

  const auth = { authorization: `Bearer ${key}` };
  const event = {
    title: TITLE,
    date: inDays(10),
    time: "18:30",
    summary: "Puja and aarti, from the mandir's own website.",
    kind: "festival",
    languages: ["gu", "en"],
  };

  // Added, published straight away as the mandir's own.
  const added = await request.put(`/api/v1/events/${ID}`, {
    headers: auth,
    data: event,
  });
  expect(added.status()).toBe(201);
  const body = await added.json();
  expect(body).toMatchObject({ id: ID, status: "published", created: true });
  const path = new URL(body.url).pathname;
  await page.goto(path);
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(page.getByText("Confirmed by the mandir").first()).toBeVisible();

  // Changed by the same id, not added twice.
  const changed = await request.put(`/api/v1/events/${ID}`, {
    headers: auth,
    data: { ...event, time: "19:00" },
  });
  expect(changed.status()).toBe(200);
  expect((await changed.json()).toran_id).toBe(body.toran_id);
  expect(
    sql(
      `select count(*) from public.events where title = '${TITLE}' and status <> 'removed'`,
    ),
  ).toBe("1");

  // Mistakes say which field.
  const wrong = await request.put(`/api/v1/events/${ID}-2`, {
    headers: auth,
    data: { ...event, date: "8 November" },
  });
  expect(wrong.status()).toBe(422);
  expect((await wrong.json()).field).toBe("date");

  // Listed, then taken off.
  const listed = await (
    await request.get("/api/v1/events", { headers: auth })
  ).json();
  expect(listed.events.map((e: { id: string }) => e.id)).toContain(ID);
  expect(
    (await request.delete(`/api/v1/events/${ID}`, { headers: auth })).status(),
  ).toBe(204);
  expect(
    (await request.delete(`/api/v1/events/${ID}`, { headers: auth })).status(),
  ).toBe(404);
  expect((await page.goto(path))!.status()).toBe(404);

  // A made-up key, or none, gets nowhere.
  expect(
    (
      await request.get("/api/v1/events", {
        headers: { authorization: `Bearer toran_${"x".repeat(43)}` },
      })
    ).status(),
  ).toBe(401);
  expect((await request.get("/api/v1/events")).status()).toBe(401);

  // The committee stops the key: it no longer works.
  await page.goto(`/manage/${SLUG}`);
  sheet = await developerKeys(page);
  await expect(
    sheet.getByRole("list", { name: "Working keys" }).getByText("Our website"),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "Stop this key" }).click();
  await expect(page.getByText("That key no longer works")).toBeVisible();
  expect(
    (await request.get("/api/v1/events", { headers: auth })).status(),
  ).toBe(401);
});

import { expect, test } from "@playwright/test";

// Calendar feeds with the starting data (festival dates, mandirs without
// events). Adding an event and finding it in the feed is covered in
// mandir-admin.spec.ts.

test("festival dates can be subscribed to as a calendar", async ({
  request,
}) => {
  const response = await request.get("/festivals/calendar.ics");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  const text = await response.text();
  expect(text).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(text).toContain("X-WR-CALNAME:Hindu festivals · Toran");
  expect(text).toContain("BEGIN:VEVENT");
  expect(text).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
  expect(text.trimEnd()).toMatch(/END:VCALENDAR$/);
});

test("a mandir's calendar is there even before it has events", async ({
  request,
}) => {
  const response = await request.get(
    "/mandirs/geeta-bhavan-leicester/calendar.ics",
  );
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain("X-WR-CALNAME:Geeta Bhavan Leicester · Toran");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
});

test("unknown mandirs and events have no calendar", async ({ request }) => {
  expect(
    (await request.get("/mandirs/no-such-mandir/calendar.ics")).status(),
  ).toBe(404);
  expect(
    (
      await request.get(
        "/mandirs/geeta-bhavan-leicester/calendar.ics?event=00000000-0000-0000-0000-000000000000",
      )
    ).status(),
  ).toBe(404);
});

test("a mandir's page offers its events for your calendar", async ({
  page,
}) => {
  await page.goto("/mandirs/geeta-bhavan-leicester");
  await expect(
    page.getByRole("heading", { name: "Get these events in your calendar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Apple or Outlook calendar" }),
  ).toHaveAttribute(
    "href",
    /^webcal:\/\/.+\/mandirs\/geeta-bhavan-leicester\/calendar\.ics$/,
  );
});

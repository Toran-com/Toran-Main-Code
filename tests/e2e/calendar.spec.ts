import { expect, test } from "@playwright/test";

// The test build has no database: calendar addresses say so plainly.

test("calendar feeds explain they aren't available yet", async ({
  request,
}) => {
  for (const path of ["/festivals/calendar.ics", "/mandirs/any/calendar.ics"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(503);
    expect(await response.text()).toContain("aren't available yet");
  }
});

test("the festivals page offers its dates for your calendar", async ({
  page,
}) => {
  await page.goto("/festivals");
  await expect(
    page.getByRole("heading", { name: "Festival dates in your calendar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Apple or Outlook calendar" }),
  ).toHaveAttribute("href", /^webcal:\/\/.+\/festivals\/calendar\.ics$/);
  await expect(
    page.getByRole("link", { name: "Google Calendar" }),
  ).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\/.*cid=webcal/);
});

import { expect, test } from "@playwright/test";

// The weekly email stays off until ICO registration and the DPIA
// (decision 0006): no sign-up page, and the send needs the cron secret.
test("the weekly email sign-up isn't there while it's off", async ({
  page,
}) => {
  for (const path of ["/weekly", "/weekly/confirm?code=x"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("the weekly send needs the cron secret", async ({ request }) => {
  const response = await request.get("/api/cron/weekly");
  expect(response.status()).toBe(404);
});

test("unsubscribe links always work, even with a bad code", async ({
  page,
  request,
}) => {
  const response = await page.goto("/weekly/leave?code=nonsense");
  expect(response?.status()).toBe(200);
  const oneClick = await request.post("/api/weekly/leave?code=nonsense");
  expect(oneClick.status()).toBe(200);
});

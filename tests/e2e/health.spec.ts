import { expect, test } from "@playwright/test";

// The test build has no database settings, so the check must say so
// clearly rather than crash or claim all is well.
test("health check reports an unconnected database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toMatchObject({
    status: "degraded",
    database: "not configured",
  });
});

// The nightly job only runs for Vercel Cron, which sends CRON_SECRET.
test("the nightly job can't be started by anyone else", async ({ request }) => {
  for (const headers of [{}, { authorization: "Bearer guess" }] as Record<
    string,
    string
  >[]) {
    const response = await request.get("/api/cron/nightly", { headers });
    expect(response.status()).toBe(404);
  }
});

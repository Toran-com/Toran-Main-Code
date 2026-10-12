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

import { expect, test } from "@playwright/test";

// Phone notifications (decision 0024) stay off until Toran's push keys are
// set up: no button, and the endpoints answer "not found".
test("notifications aren't offered until they're set up", async ({
  request,
}) => {
  const save = await request.post("/api/push", {
    data: {
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
      },
      mandirs: ["a"],
    },
  });
  expect(save.status()).toBe(404);
  expect((await request.get("/api/cron/push")).status()).toBe(404);
});

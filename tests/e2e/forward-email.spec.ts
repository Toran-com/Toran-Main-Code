import { expect, test } from "@playwright/test";

// Forwarding to Toran by email (decision 0031): only Resend, which signs
// each request, can hand Toran an email to read.
test("the inbound email webhook turns away anything unsigned", async ({
  request,
}) => {
  const body = { type: "email.received", data: { email_id: "em_madeup" } };
  const unsigned = await request.post("/api/inbound/email", { data: body });
  expect(unsigned.status()).toBe(404);
  const forged = await request.post("/api/inbound/email", {
    data: body,
    headers: {
      "svix-id": "msg_madeup",
      "svix-timestamp": String(Math.floor(Date.now() / 1000)),
      "svix-signature": "v1,bm90IGEgcmVhbCBzaWduYXR1cmU=",
    },
  });
  expect(forged.status()).toBe(404);
  expect((await request.get("/api/inbound/email")).status()).toBe(405);
});

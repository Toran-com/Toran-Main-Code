import { expect, test } from "@playwright/test";

// Every page tells browsers not to let other sites frame it, not to guess
// file types, and not to hand out the camera or microphone.
test("pages are sent with the security headers", async ({ request }) => {
  for (const path of ["/", "/login", "/corrections"]) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'self'",
    );
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("geolocation=(self)");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

import { test } from "@playwright/test";
import { expectAccessible } from "../a11y";

// Public pages without a database (what a visitor sees before it's
// connected) must still meet WCAG 2.2 AA.
for (const path of [
  "/",
  "/mandirs",
  "/festivals",
  "/whats-on",
  "/seva",
  "/diwali",
  "/holi",
  "/demo",
  "/for-mandirs",
  "/about",
  "/privacy",
  "/corrections",
  "/gu",
  "/gu/whats-on",
  "/gu/seva",
  "/for-mandirs/guide",
  "/for-mandirs/guide/print",
  "/offline",
  "/login",
  "/no-such-page",
]) {
  test(`${path} is accessible`, async ({ page }) => {
    await page.goto(path);
    await expectAccessible(page);
  });
}

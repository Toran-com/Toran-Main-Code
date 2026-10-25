import { defineConfig, devices } from "@playwright/test";

// Login tests against a real local Supabase. Run by the Database workflow;
// locally: `pnpm dlx supabase start`, build with its URL and key, then
// `pnpm exec playwright test -c playwright.auth.config.ts`.
const port = 3100;

export default defineConfig({
  testDir: "tests/e2e-auth",
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // As if "Where are you?" had been answered "all of the UK", so it
    // doesn't open over other tests. tests/e2e/place-picker.spec.ts
    // starts without it.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${port}`,
          localStorage: [{ name: "toran:place", value: '{"skip":true}' }],
        },
      ],
    },
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
        },
      },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

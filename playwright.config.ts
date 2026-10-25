import { defineConfig, devices } from "@playwright/test";

// Lets tests block the app's service worker's network requests too, to see
// what it does offline (tests/e2e/install-app.spec.ts).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
        // Lets a machine with its own Chromium (set PLAYWRIGHT_CHROMIUM_PATH)
        // run the tests without downloading browsers.
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
        },
      },
    },
  ],
  // The tests run against a production build, as the live site will. In CI
  // the build is a separate step, so only the server is started here.
  webServer: {
    command: process.env.CI
      ? `pnpm start --port ${port}`
      : `pnpm build && pnpm start --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

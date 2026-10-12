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
  use: { baseURL: `http://localhost:${port}` },
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

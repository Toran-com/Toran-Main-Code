// The numbers on "How Toran is built" (/how-its-built) and in the README.
// Measured, not estimated: update them, and the date, when they change.
// Lighthouse 12 against a production build with real Diwali 2026 events;
// "mobile" is Lighthouse's default slow phone (4x slower processor,
// throttled network), "desktop" its desktop preset.
export const BUILT_FACTS = {
  measuredOn: "4 November 2026",
  lighthouse: {
    // The lowest score across two runs of the home page, What's on, a
    // mandir's page, the festivals page and this page, so no page is
    // flattered. (SEO isn't quoted: until launch every page asks search
    // engines to leave it out, on purpose.)
    mobile: { performance: 92, accessibility: 100, bestPractices: 100 },
    desktop: { performance: 100, accessibility: 100, bestPractices: 100 },
  },
  tests: {
    unit: 1964,
    browser: 144,
    withDatabase: 76,
    databaseSecurityFiles: 35,
  },
  budget: { javascriptKb: 250, totalKb: 350 },
  migrations: 48,
  decisions: 18,
} as const;

import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Checks the page against WCAG 2.2 AA with axe, in light and dark mode
// (many visitors use their phone's dark mode). Fails with a readable list
// of what's wrong and where. Checked with reduced motion, so colours are
// measured once things have faded in rather than part way through.
export async function expectAccessible(page: Page) {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    // Let any colour change from the switch of mode finish first.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
    );
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const problems = violations.flatMap((v) =>
      v.nodes.map(
        (n) =>
          `${colorScheme}: ${v.id} (${v.impact}) at ${n.target.join(" ")}: ${v.help}`,
      ),
    );
    expect(problems, `Accessibility problems on ${page.url()}`).toEqual([]);
  }
}

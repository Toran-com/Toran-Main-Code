// Towns, for the festival season pages per town (/diwali/leicester): a
// town's address from its name, and the towns the mandirs are in. Pure, so
// it's tested on its own.

// "Milton Keynes" → "milton-keynes", "Stoke-on-Trent" → "stoke-on-trent".
export function townSlug(town: string): string {
  return town
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The town an address names, as the mandirs spell it (the first one's
// spelling if they differ), or null if no mandir is there.
export function townNamed(
  slug: string,
  mandirs: readonly { town: string }[],
): string | null {
  return mandirs.find((m) => townSlug(m.town) === slug)?.town ?? null;
}

// Towns with something on, by name (easiest to find your own), with how
// many events each has, from events that carry their mandir's town.
export function townCounts(
  events: readonly { mandir: { town: string } }[],
): { slug: string; town: string; count: number }[] {
  const towns = new Map<
    string,
    { slug: string; town: string; count: number }
  >();
  for (const e of events) {
    const slug = townSlug(e.mandir.town);
    if (!slug) continue;
    const t = towns.get(slug) ?? { slug, town: e.mandir.town, count: 0 };
    t.count++;
    towns.set(slug, t);
  }
  return [...towns.values()].sort((a, b) => a.town.localeCompare(b.town));
}

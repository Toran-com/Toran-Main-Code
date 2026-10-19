// Grouping and searching the mandir list (pure, and light enough for the
// browser).

// "east-midlands" for "East Midlands", for in-page links.
export function anchorFor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type TownGroup<T> = { town: string; mandirs: T[] };
export type RegionGroup<T> = { region: string; towns: TownGroup<T>[] };

// Groups mandirs by region, then town, each sorted alphabetically.
export function groupByRegionAndTown<
  T extends { region: string; town: string; name: string },
>(mandirs: readonly T[]): RegionGroup<T>[] {
  const regions = new Map<string, Map<string, T[]>>();
  for (const m of mandirs) {
    const towns = regions.get(m.region) ?? new Map<string, T[]>();
    regions.set(m.region, towns);
    towns.set(m.town, [...(towns.get(m.town) ?? []), m]);
  }
  const byName = (a: string, b: string) => a.localeCompare(b, "en-GB");
  return [...regions.entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([region, towns]) => ({
      region,
      towns: [...towns.entries()]
        .sort(([a], [b]) => byName(a, b))
        .map(([town, list]) => ({
          town,
          mandirs: [...list].sort((a, b) => byName(a.name, b.name)),
        })),
    }));
}

// Keeps mandirs whose name, town or region contains every word typed.
export function matchesSearch(
  m: { name: string; town: string; region: string; tradition?: string | null },
  query: string,
): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text =
    `${m.name} ${m.town} ${m.region} ${m.tradition ?? ""}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

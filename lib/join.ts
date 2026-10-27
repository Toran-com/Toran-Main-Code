import { matches, parseQuery } from "@/lib/search";

// "Choose your mandir" when creating a committee account: the mandirs
// whose name, town or region match what was typed, best first (a name
// match before a town or region one), at most a dozen.

export const MOST_MANDIRS = 12;

type Choice = { name: string; town: string; region: string };

export function findMandirs<M extends Choice>(
  mandirs: readonly M[],
  text: string,
): { found: M[]; more: boolean } {
  const query = parseQuery(text);
  if (!query) return { found: [], more: false };
  const byName = mandirs.filter((m) => matches(query, m.name));
  const byPlace = mandirs.filter(
    (m) => !byName.includes(m) && matches(query, m.name, m.town, m.region),
  );
  const all = [...byName, ...byPlace];
  return { found: all.slice(0, MOST_MANDIRS), more: all.length > MOST_MANDIRS };
}

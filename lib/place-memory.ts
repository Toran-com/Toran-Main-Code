// The place this phone chose to see events near ("Where are you?"), kept
// in the browser only, so What's on, the season pages, Seva and the home
// page all start there. Browser code; never sent anywhere by itself.

const KEY = "toran:place";
const DEFAULT_MILES = 15;

export type SavedPlace = { near: string; within: number } | { skip: true };

export function readSaved(): SavedPlace | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    if ("skip" in raw && raw.skip === true) return { skip: true };
    if (
      "near" in raw &&
      typeof raw.near === "string" &&
      raw.near &&
      "within" in raw &&
      typeof raw.within === "number"
    ) {
      return { near: raw.near.slice(0, 10), within: raw.within };
    }
  } catch {
    // Storage blocked or spoiled: as if nothing was saved.
  }
  return null;
}

export function savePlace(value: SavedPlace | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved; the page still works.
  }
}

// A page's address with a place (or none), keeping the visitor's other
// choices ("keep", a query string). A region only stays when no place is
// chosen.
export function placeHref(
  page: string,
  keep: string,
  place: { near?: string; within?: number; region?: string; pick?: boolean },
): string {
  const query = new URLSearchParams(keep);
  if (place.near) {
    query.set("near", place.near);
    if (place.within && place.within !== DEFAULT_MILES) {
      query.set("within", String(place.within));
    }
  } else if (place.region) {
    query.set("region", place.region);
  }
  if (place.pick) query.set("pick", "1");
  const q = query.toString();
  return q ? `${page}?${q}` : page;
}

// The mandir list and map. English; the Gujarati is in
// lib/i18n/client-messages-gu.ts.
export const enMandirs = {
  "whatsOn.nearMe": "Near me",
  "whatsOn.finding": "Finding you…",
  "mandirs.find": "Find a mandir or town",
  "mandirs.findExample": "e.g. Leicester, BAPS, Harrow",
  "mandirs.countOf": "{shown} of {total} mandirs",
  "mandirs.count": "{total} mandirs",
  "mandirs.showAs": "Show mandirs as",
  "mandirs.map": "Map",
  "mandirs.list": "List",
  "mandirs.noMatch":
    "No mandirs match “{query}”. Try a nearby town, or check the spelling.",
  "mandirs.regions": "Regions",
  // UK regions, as mandirs are grouped (lib/mandir-form.ts REGIONS).
  "region.East Midlands": "East Midlands",
  "region.East of England": "East of England",
  "region.London": "London",
  "region.North East": "North East",
  "region.North West": "North West",
  "region.Northern Ireland": "Northern Ireland",
  "region.Scotland": "Scotland",
  "region.South East": "South East",
  "region.South West": "South West",
  "region.Wales": "Wales",
  "region.West Midlands": "West Midlands",
  "region.Yorkshire": "Yorkshire",
  "map.seeWhatsOn": "See what's on →",
  "map.cluster": "{count} mandirs near here",
  "map.clusterTitle": "{label}: zoom in",
  "map.clusterLabel": "{label}. Zoom in to see them.",
  "map.youAreHere": "You are here",
  "map.denied":
    "Your browser didn't share your location. You can zoom in on the map instead.",
  "map.failed":
    "We couldn't find your location just now. You can zoom in on the map instead.",
  "map.label": "Map of mandirs. The list view has every mandir too.",
  "map.noneOnMap":
    "None of these mandirs is on the map yet. They're all in the list.",
  "map.missing.one":
    "{count} mandir isn't on the map yet (no map position). It's in the list.",
  "map.missing.other":
    "{count} mandirs aren't on the map yet (no map position). They're in the list.",
} as const;

// A region's key, if it has a translation, so a region missing from the
// list still shows as it's stored.
export function regionKey(region: string): keyof typeof enMandirs | null {
  const key = `region.${region}`;
  return key in enMandirs ? (key as keyof typeof enMandirs) : null;
}

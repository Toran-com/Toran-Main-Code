// Postcodes to map positions, and distances between them. Positions come
// from postcodes.io, which serves the ONS Postcode Directory (Open
// Government Licence). Only mandirs' postcodes and a visitor's typed
// postcode are looked up; neither is stored with anyone's name.

export type Position = { latitude: number; longitude: number };

const API = "https://api.postcodes.io";
const BATCH = 100; // postcodes.io's limit per bulk request

// "le4 6ar" → "LE4 6AR"; null if it isn't a UK postcode.
export function normalisePostcode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = /^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/.exec(compact);
  return match ? `${match[1]} ${match[2]}` : null;
}

type Fetch = typeof fetch;

// Looks up many postcodes at once. Postcodes it can't find map to null.
export async function lookupPostcodes(
  postcodes: string[],
  fetcher: Fetch = fetch,
): Promise<Map<string, Position | null>> {
  const found = new Map<string, Position | null>();
  const unique = [...new Set(postcodes.map(normalisePostcode))].filter(
    (p): p is string => p !== null,
  );
  for (let i = 0; i < unique.length; i += BATCH) {
    const chunk = unique.slice(i, i + BATCH);
    const response = await fetcher(`${API}/postcodes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: chunk }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`postcodes.io answered ${response.status}`);
    const body = (await response.json()) as {
      result: {
        query: string;
        result: { latitude: number | null; longitude: number | null } | null;
      }[];
    };
    for (const { query, result } of body.result) {
      const key = normalisePostcode(query) ?? query;
      found.set(
        key,
        result && result.latitude !== null && result.longitude !== null
          ? { latitude: result.latitude, longitude: result.longitude }
          : null,
      );
    }
  }
  return found;
}

// One postcode, for a visitor's "near me" search. Accepts outward codes
// ("LE4") too, using the centre of that district.
export async function lookupPostcode(
  input: string,
  fetcher: Fetch = fetch,
): Promise<Position | null> {
  const full = normalisePostcode(input);
  const outward = input.toUpperCase().replace(/\s/g, "");
  const url = full
    ? `${API}/postcodes/${encodeURIComponent(full)}`
    : /^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(outward)
      ? `${API}/outcodes/${encodeURIComponent(outward)}`
      : null;
  if (!url) return null;
  const response = await fetcher(url, { signal: AbortSignal.timeout(5_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`postcodes.io answered ${response.status}`);
  const body = (await response.json()) as {
    result: { latitude: number | null; longitude: number | null } | null;
  };
  const r = body.result;
  return r && r.latitude !== null && r.longitude !== null
    ? { latitude: r.latitude, longitude: r.longitude }
    : null;
}

// The postcode district ("RG1") nearest a position, for What's on's "Near
// me". Runs in the visitor's browser, so their position goes only to
// postcodes.io, never to Toran; Toran gets the district, as if typed.
export async function outcodeNear(
  at: Position,
  fetcher: Fetch = fetch,
): Promise<string | null> {
  const query = new URLSearchParams({
    lat: at.latitude.toFixed(2),
    lon: at.longitude.toFixed(2),
    limit: "1",
    radius: "25000",
  });
  const response = await fetcher(`${API}/outcodes?${query}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`postcodes.io answered ${response.status}`);
  const body = (await response.json()) as {
    result: { outcode?: unknown }[] | null;
  };
  const outcode = body.result?.[0]?.outcode;
  return typeof outcode === "string" &&
    /^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(outcode)
    ? outcode
    : null;
}

// Straight-line distance in miles (haversine).
export function distanceMiles(a: Position, b: Position): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

// "0.4 miles", "3 miles", "12 miles".
export function formatMiles(miles: number): string {
  if (miles < 1) return `${miles.toFixed(1)} miles`;
  const rounded = Math.round(miles);
  return `${rounded} ${rounded === 1 ? "mile" : "miles"}`;
}

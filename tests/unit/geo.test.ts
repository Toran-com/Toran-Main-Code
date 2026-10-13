import { describe, expect, it, vi } from "vitest";
import {
  distanceMiles,
  formatMiles,
  lookupPostcode,
  lookupPostcodes,
  normalisePostcode,
} from "@/lib/geo";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("normalisePostcode", () => {
  it("tidies spacing and case", () => {
    expect(normalisePostcode("le46ar")).toBe("LE4 6AR");
    expect(normalisePostcode(" sw1a  1aa ")).toBe("SW1A 1AA");
    expect(normalisePostcode("W1D 3DL")).toBe("W1D 3DL");
  });
  it("rejects things that aren't postcodes", () => {
    expect(normalisePostcode("LE4")).toBeNull();
    expect(normalisePostcode("hello")).toBeNull();
  });
});

describe("lookupPostcodes", () => {
  it("asks once per 100 and maps unknown postcodes to null", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const { postcodes } = JSON.parse(String(init?.body));
      return json({
        result: postcodes.map((q: string) => ({
          query: q,
          result: q === "ZZ9 9ZZ" ? null : { latitude: 52.6, longitude: -1.1 },
        })),
      });
    });
    const many = Array.from({ length: 150 }, (_, i) => `LE${(i % 9) + 1} 6AR`);
    const found = await lookupPostcodes(
      [...many, "zz99zz", "LE1 6AR"],
      fetcher as unknown as typeof fetch,
    );
    expect(fetcher).toHaveBeenCalledTimes(1); // only 10 unique
    expect(found.get("LE1 6AR")).toEqual({ latitude: 52.6, longitude: -1.1 });
    expect(found.get("ZZ9 9ZZ")).toBeNull();
  });
  it("reports a failed lookup", async () => {
    const fetcher = vi.fn(async () => json({}, 500));
    await expect(
      lookupPostcodes(["LE4 6AR"], fetcher as unknown as typeof fetch),
    ).rejects.toThrow("500");
  });
});

describe("lookupPostcode", () => {
  it("looks up a full postcode or a district", async () => {
    const fetcher = vi.fn(async (url: string) =>
      json({
        result: { latitude: url.includes("outcodes") ? 1 : 2, longitude: 0 },
      }),
    );
    const f = fetcher as unknown as typeof fetch;
    expect(await lookupPostcode("le4 6ar", f)).toEqual({
      latitude: 2,
      longitude: 0,
    });
    expect(await lookupPostcode("LE4", f)).toEqual({
      latitude: 1,
      longitude: 0,
    });
    expect(fetcher.mock.calls[0][0]).toContain("/postcodes/LE4%206AR");
    expect(await lookupPostcode("not a place", f)).toBeNull();
  });
  it("returns null for unknown postcodes", async () => {
    const fetcher = vi.fn(async () => json({ status: 404 }, 404));
    expect(
      await lookupPostcode("ZZ9 9ZZ", fetcher as unknown as typeof fetch),
    ).toBeNull();
  });
});

describe("distances", () => {
  it("measures Leicester to London at about 89 miles", () => {
    const leicester = { latitude: 52.6369, longitude: -1.1398 };
    const london = { latitude: 51.5074, longitude: -0.1278 };
    expect(distanceMiles(leicester, london)).toBeGreaterThan(85);
    expect(distanceMiles(leicester, london)).toBeLessThan(92);
  });
  it("formats miles", () => {
    expect(formatMiles(0.42)).toBe("0.4 miles");
    expect(formatMiles(1.2)).toBe("1 mile");
    expect(formatMiles(12.6)).toBe("13 miles");
  });
});

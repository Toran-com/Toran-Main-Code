import { describe, expect, it } from "vitest";
import {
  EVENT_KINDS,
  kindLabel,
  originOfPoster,
  sourceLabel,
} from "@/lib/event-kinds";

describe("kindLabel", () => {
  it("names each kind, but not 'other'", () => {
    expect(kindLabel("festival")).toBe("Festival");
    expect(kindLabel("other")).toBeNull();
    expect(kindLabel("not a kind")).toBeNull();
  });

  it("matches the kinds the database allows", () => {
    // events.kind check in supabase/migrations/20261012100100_events.sql
    expect(Object.keys(EVENT_KINDS).sort()).toEqual(
      [
        "festival",
        "aarti",
        "bhajan",
        "katha",
        "class",
        "seva",
        "youth",
        "community",
        "other",
      ].sort(),
    );
  });
});

describe("originOfPoster", () => {
  it("keeps websites and visitors apart from forwarded posters", () => {
    expect(originOfPoster("website")).toBe("website");
    expect(originOfPoster("visitor")).toBe("visitor");
    expect(originOfPoster("whatsapp")).toBe("poster");
    expect(originOfPoster("printed")).toBe("poster");
  });
});

describe("sourceLabel", () => {
  it("says the mandir confirmed it, whatever its origin", () => {
    expect(
      sourceLabel({ confirmed_at: "2026-10-14T10:00:00Z", origin: "visitor" }),
    ).toBe("Confirmed by the mandir");
  });
  it("otherwise says where it came from", () => {
    expect(sourceLabel({ confirmed_at: null, origin: "website" })).toBe(
      "From the mandir's website",
    );
    expect(sourceLabel({ confirmed_at: null, origin: "visitor" })).toBe(
      "Sent in by a visitor",
    );
    expect(sourceLabel({ confirmed_at: null, origin: "poster" })).toBe(
      "From a poster or message",
    );
    expect(sourceLabel({ confirmed_at: null, origin: null })).toBeNull();
  });
});

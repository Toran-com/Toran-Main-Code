import { describe, expect, it } from "vitest";
import { townCounts, townNamed, townSlug } from "@/lib/towns";

describe("townSlug", () => {
  it("makes a short address from a town's name", () => {
    expect(townSlug("Leicester")).toBe("leicester");
    expect(townSlug("Milton Keynes")).toBe("milton-keynes");
    expect(townSlug("Stoke-on-Trent")).toBe("stoke-on-trent");
    expect(townSlug("King's Lynn")).toBe("kings-lynn");
    expect(townSlug(" Brighton & Hove ")).toBe("brighton-and-hove");
  });
});

describe("townNamed", () => {
  const mandirs = [{ town: "Leicester" }, { town: "Milton Keynes" }];
  it("finds the town an address names", () => {
    expect(townNamed("milton-keynes", mandirs)).toBe("Milton Keynes");
    expect(townNamed("leeds", mandirs)).toBeNull();
  });
});

describe("townCounts", () => {
  it("counts events per town, by name", () => {
    const at = (town: string) => ({ mandir: { town } });
    expect(
      townCounts([at("Leicester"), at("Harrow"), at("Leicester"), at("Leeds")]),
    ).toEqual([
      { slug: "harrow", town: "Harrow", count: 1 },
      { slug: "leeds", town: "Leeds", count: 1 },
      { slug: "leicester", town: "Leicester", count: 2 },
    ]);
  });
});

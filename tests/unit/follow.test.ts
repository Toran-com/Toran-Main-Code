import { describe, expect, it } from "vitest";
import { cleanSlugs, MAX_FOLLOWED, parseFollowing } from "@/lib/follow";

describe("cleanSlugs", () => {
  it("reads ?mandirs= as a list of mandir addresses", () => {
    expect(cleanSlugs("geeta-bhavan-leicester,SHREE-RAM , ")).toEqual([
      "geeta-bhavan-leicester",
      "shree-ram",
    ]);
  });

  it("takes repeated ?mandirs= too, and stored lists", () => {
    expect(cleanSlugs(["a-b,c", "d"])).toEqual(["a-b", "c", "d"]);
  });

  it("leaves out anything that isn't an address, and repeats", () => {
    expect(
      cleanSlugs(["ok", "ok", "no/slash", "-dash", "a b", 7, "x".repeat(101)]),
    ).toEqual(["ok"]);
    expect(cleanSlugs(undefined)).toEqual([]);
    expect(cleanSlugs({ near: "x" })).toEqual([]);
  });

  it("keeps at most so many", () => {
    const many = Array.from({ length: 50 }, (_, i) => `m${i}`);
    expect(cleanSlugs(many)).toHaveLength(MAX_FOLLOWED);
  });
});

describe("parseFollowing", () => {
  it("reads what the phone saved, or nothing if it's spoiled", () => {
    expect(parseFollowing('["a","b"]')).toEqual(["a", "b"]);
    expect(parseFollowing("")).toEqual([]);
    expect(parseFollowing("{nope")).toEqual([]);
    expect(parseFollowing('"a"')).toEqual(["a"]);
  });
});

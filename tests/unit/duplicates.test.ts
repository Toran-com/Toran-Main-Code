import { describe, expect, it } from "vitest";
import { duplicatesOf, looksTheSame, titleWords } from "@/lib/duplicates";

const on = (title: string, date = "2026-11-08") => ({ title, date });

describe("titleWords", () => {
  it("keeps the words that say which event it is", () => {
    expect([...titleWords("Diwali Celebrations at the Mandir!")]).toEqual([
      "diwali",
    ]);
    expect([...titleWords("Bhajans and Kirtans")]).toEqual([
      "bhajan",
      "kirtan",
    ]);
  });
});

describe("looksTheSame", () => {
  it("matches the same event worded differently, on the same day", () => {
    expect(looksTheSame(on("Diwali"), on("Diwali celebrations"))).toBe(true);
    expect(
      looksTheSame(on("Sharad Purnima Garba"), on("Garba for Sharad Purnima")),
    ).toBe(true);
    // Different spellings of the same festival.
    expect(looksTheSame(on("Deepavali evening"), on("Diwali fireworks"))).toBe(
      true,
    );
  });

  it("doesn't match different events, or a different day", () => {
    expect(looksTheSame(on("Hanuman Chalisa"), on("Ganesh puja"))).toBe(false);
    expect(
      looksTheSame(on("Diwali"), on("Diwali celebrations", "2026-11-09")),
    ).toBe(false);
    expect(looksTheSame(on("Youth quiz night"), on("Satsang"))).toBe(false);
  });
});

describe("duplicatesOf", () => {
  it("lists the matching events and queue items, never itself", () => {
    const item = { id: "c1", ...on("Annakut darshan") };
    expect(
      duplicatesOf(item, [
        { kind: "queue", id: "c1", ...on("Annakut darshan") },
        { kind: "event", id: "e1", ...on("Annakut") },
        { kind: "queue", id: "c2", ...on("Annakut and New Year") },
        { kind: "event", id: "e2", ...on("Weekly aarti") },
      ]).map((c) => c.id),
    ).toEqual(["e1", "c2"]);
  });
});

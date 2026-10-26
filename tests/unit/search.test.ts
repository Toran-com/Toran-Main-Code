import { describe, expect, it } from "vitest";
import { matches, parseQuery, search } from "@/lib/search";

const q = (text: string) => parseQuery(text)!;

describe("parseQuery", () => {
  it("ignores empty searches and filler", () => {
    expect(parseQuery("   ")).toBeNull();
    expect(parseQuery("the mandir")).toBeNull();
  });
  it("keeps Gujarati as typed", () => {
    expect(parseQuery(" દિવાળી ")?.gujarati).toBe("દિવાળી");
  });
});

describe("matches", () => {
  it("needs every word, each starting a word", () => {
    expect(matches(q("diwali leic"), "Diwali fireworks", "Leicester")).toBe(
      true,
    );
    expect(matches(q("diwali harrow"), "Diwali fireworks", "Leicester")).toBe(
      false,
    );
    expect(matches(q("ester"), "Leicester")).toBe(false);
  });
  it("agrees on festival spellings", () => {
    expect(matches(q("deepavali"), "Diwali Lakshmi puja")).toBe(true);
    expect(matches(q("annakoot"), "Annakut darshan")).toBe(true);
  });
  it("ignores case and punctuation", () => {
    expect(matches(q("SHREE RAM"), "Shree Ram Mandir, Southall")).toBe(true);
  });
  it("finds Gujarati in Gujarati text", () => {
    expect(matches(q("દિવાળી"), "Diwali", "દિવાળી લક્ષ્મી પૂજન")).toBe(true);
    expect(matches(q("દિવાળી"), "Diwali")).toBe(false);
  });
});

describe("search", () => {
  const mandir = {
    name: "Shree Ram Mandir",
    town: "Leicester",
    region: "East Midlands",
  };
  const data = {
    events: [
      { title: "Diwali fireworks", title_gu: null, kind: "festival", mandir },
      { title: "Bhajan sandhya", title_gu: null, kind: "bhajan", mandir },
    ],
    mandirs: [{ ...mandir, tradition: "Sanatan" }],
    festivals: [{ slug: "diwali", name: "Diwali" }],
  };
  const label = (kind: string) =>
    ({ festival: "Festival", bhajan: "Bhajans or kirtan" })[kind] ?? kind;

  it("finds events, mandirs and festivals", () => {
    const found = search(data, q("leicester"), label);
    expect(found.events.count).toBe(2);
    expect(found.mandirs.count).toBe(1);
    expect(found.festivals.count).toBe(0);
    expect(search(data, q("diwali"), label).total).toBe(2);
  });
  it("matches the kind of event too", () => {
    expect(search(data, q("kirtan"), label).events.shown).toHaveLength(1);
  });
});

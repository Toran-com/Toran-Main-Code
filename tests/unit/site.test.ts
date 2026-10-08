import { describe, expect, it } from "vitest";
import { pageTitle, site } from "@/lib/site";

describe("pageTitle", () => {
  it("uses the name and tagline on the home page", () => {
    expect(pageTitle()).toBe(`Toran · ${site.tagline}`);
  });

  it("puts the page name first", () => {
    expect(pageTitle("Festivals")).toBe("Festivals · Toran");
  });

  it("ignores a blank page name", () => {
    expect(pageTitle("  ")).toBe(pageTitle());
  });
});

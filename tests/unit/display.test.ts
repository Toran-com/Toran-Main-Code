import { describe, expect, it } from "vitest";
import { DISPLAY_SCRIPT, readDisplay, STANDARD } from "@/lib/display";

describe("text size and contrast", () => {
  it("reads what was saved", () => {
    expect(readDisplay('{"text":"xl","contrast":true}')).toEqual({
      text: "xl",
      contrast: true,
    });
  });
  it("falls back to standard for anything else", () => {
    expect(readDisplay(null)).toEqual(STANDARD);
    expect(readDisplay("not json")).toEqual(STANDARD);
    expect(readDisplay('{"text":"huge","contrast":"yes"}')).toEqual(STANDARD);
  });
  it("applies it before the page is drawn", () => {
    const html = { dataset: {} as Record<string, string> };
    const store = new Map([["toran:display", '{"text":"lg","contrast":true}']]);
    new Function("localStorage", "document", DISPLAY_SCRIPT)(
      { getItem: (k: string) => store.get(k) ?? null },
      { documentElement: html },
    );
    expect(html.dataset).toEqual({ text: "lg", contrast: "high" });
  });
  it("never breaks the page if storage is blocked", () => {
    expect(() =>
      new Function("localStorage", "document", DISPLAY_SCRIPT)(
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        { documentElement: { dataset: {} } },
      ),
    ).not.toThrow();
  });
});

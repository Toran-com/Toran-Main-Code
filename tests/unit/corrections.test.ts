import { describe, expect, it } from "vitest";
import { checkCorrection, correctionPage } from "@/lib/corrections";

describe("correctionPage", () => {
  it("keeps a page on this site and nothing else", () => {
    expect(correctionPage("/mandirs/reading-hindu-temple")).toBe(
      "/mandirs/reading-hindu-temple",
    );
    expect(correctionPage("https://example.org")).toBe("/");
    expect(correctionPage("//example.org")).toBe("/");
    expect(correctionPage("/has a space")).toBe("/");
    expect(correctionPage(null)).toBe("/");
  });
});

describe("checkCorrection", () => {
  it("accepts a complete request", () => {
    expect(
      checkCorrection({
        kind: "wrong",
        page: "/mandirs/x",
        details: "  Aarti is at 7pm  ",
      }),
    ).toEqual({
      ok: true,
      kind: "wrong",
      page: "/mandirs/x",
      details: "Aarti is at 7pm",
    });
  });

  it("asks for a kind and some details", () => {
    expect(checkCorrection({ kind: "nope", page: "/", details: "Hi" })).toEqual(
      { ok: false, error: "kind" },
    );
    expect(checkCorrection({ kind: "other", page: "/", details: " " })).toEqual(
      { ok: false, error: "details" },
    );
    expect(
      checkCorrection({ kind: "other", page: "/", details: "x".repeat(1001) }),
    ).toEqual({ ok: false, error: "details" });
  });
});

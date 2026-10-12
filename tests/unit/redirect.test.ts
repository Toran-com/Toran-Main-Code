import { describe, expect, it } from "vitest";
import { looksLikeEmail, safeNextPath } from "@/lib/redirect";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/ops?tab=claims#top")).toBe("/ops?tab=claims#top");
  });

  it("falls back when there is nothing", () => {
    expect(safeNextPath(null)).toBe("/account");
    expect(safeNextPath("", "/")).toBe("/");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example/path",
      "/%0d%0aSet-Cookie:x",
      "/ok\nLocation: https://evil.example",
    ]) {
      const out = safeNextPath(bad);
      expect(out.startsWith("/")).toBe(true);
      expect(out.startsWith("//")).toBe(false);
      expect(out).not.toContain("evil.example\n");
      expect(new URL(out, "https://toran.co.uk").origin).toBe(
        "https://toran.co.uk",
      );
    }
  });
});

describe("looksLikeEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(looksLikeEmail("secretary@mandir.org.uk")).toBe(true);
    expect(looksLikeEmail(" name.surname+seva@gmail.com ")).toBe(true);
  });

  it("rejects things that are not addresses", () => {
    for (const bad of [
      "",
      "mandir",
      "a@b",
      "a @b.com",
      "@mandir.org",
      `${"a".repeat(250)}@x.com`,
    ]) {
      expect(looksLikeEmail(bad)).toBe(false);
    }
  });
});

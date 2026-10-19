import { describe, expect, it } from "vitest";
import { EVENT_ERRORS } from "@/lib/event-form";
import { en } from "@/lib/i18n/en";
import { hasGujarati, otherLanguagePath, withLocale } from "@/lib/i18n/paths";

describe("Gujarati addresses", () => {
  it("covers families' pages, not committees' or admins'", () => {
    for (const path of [
      "/",
      "/whats-on",
      "/mandirs",
      "/mandirs/reading-hindu-temple",
      "/mandirs/reading-hindu-temple/tell-us",
      "/mandirs/x/events/abc",
      "/mandirs/x/events/abc/seva",
      "/festivals",
      "/festivals/diwali",
      "/whats-on?near=LE4",
    ]) {
      expect(hasGujarati(path), path).toBe(true);
    }
    for (const path of [
      "/for-mandirs",
      "/for-mandirs/guide",
      "/manage/x",
      "/ops",
      "/mandirs/x/print",
      "/mandirs/x/claim",
      "/login",
    ]) {
      expect(hasGujarati(path), path).toBe(false);
    }
  });

  it("puts /gu in front only where there's a Gujarati page", () => {
    expect(withLocale("/mandirs/x", "gu")).toBe("/gu/mandirs/x");
    expect(withLocale("/", "gu")).toBe("/gu");
    expect(withLocale("/for-mandirs", "gu")).toBe("/for-mandirs");
    expect(withLocale("/mandirs/x", "en")).toBe("/mandirs/x");
  });

  it("switches between the two", () => {
    expect(otherLanguagePath("/gu/festivals/holi")).toBe("/festivals/holi");
    expect(otherLanguagePath("/gu")).toBe("/");
    expect(otherLanguagePath("/whats-on")).toBe("/gu/whats-on");
    expect(otherLanguagePath("/for-mandirs")).toBe("/for-mandirs");
  });
});

describe("the form's messages", () => {
  it("say the same as the committee form's in English", () => {
    for (const [code, text] of Object.entries(EVENT_ERRORS)) {
      expect(en[`report.error.${code}` as keyof typeof en]).toBe(text);
    }
  });
});

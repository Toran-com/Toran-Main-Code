import { describe, expect, it } from "vitest";
import { EVENT_ERRORS } from "@/lib/event-form";
import { en } from "@/lib/i18n/en";
import {
  englishPath,
  hasTranslation,
  languagePath,
  localeOfPath,
  withLocale,
} from "@/lib/i18n/paths";
import { SEASONS } from "@/lib/seasons";

describe("Gujarati and Hindi addresses", () => {
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
      expect(hasTranslation(path), path).toBe(true);
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
      expect(hasTranslation(path), path).toBe(false);
    }
  });

  it("puts /gu or /hi in front only where there's a translated page", () => {
    expect(withLocale("/mandirs/x", "gu")).toBe("/gu/mandirs/x");
    expect(withLocale("/", "gu")).toBe("/gu");
    expect(withLocale("/mandirs/x", "hi")).toBe("/hi/mandirs/x");
    expect(withLocale("/", "hi")).toBe("/hi");
    expect(withLocale("/for-mandirs", "hi")).toBe("/for-mandirs");
    expect(withLocale("/for-mandirs", "gu")).toBe("/for-mandirs");
    expect(withLocale("/mandirs/x", "en")).toBe("/mandirs/x");
  });

  it("covers every festival season page, and nothing like one", () => {
    for (const { slug } of SEASONS) {
      expect(withLocale(`/${slug}`, "gu")).toBe(`/gu/${slug}`);
    }
    expect(hasTranslation("/easter")).toBe(false);
    expect(hasTranslation("/holi/calendar.ics")).toBe(false);
    // And each season in a town.
    expect(withLocale("/diwali/leicester", "gu")).toBe("/gu/diwali/leicester");
    expect(hasTranslation("/diwali/leicester/x")).toBe(false);
  });

  it("knows a page's language", () => {
    expect(localeOfPath("/gu")).toBe("gu");
    expect(localeOfPath("/hi/whats-on")).toBe("hi");
    expect(localeOfPath("/whats-on")).toBe("en");
    // Only a whole first part of the address counts.
    expect(localeOfPath("/guide")).toBe("en");
    expect(localeOfPath("/hindu-temples")).toBe("en");
    expect(englishPath("/hi")).toBe("/");
    expect(englishPath("/gu/mandirs/x")).toBe("/mandirs/x");
    expect(englishPath("/mandirs/x")).toBe("/mandirs/x");
  });

  it("switches between the languages", () => {
    expect(languagePath("/gu/festivals/holi", "en")).toBe("/festivals/holi");
    expect(languagePath("/gu", "en")).toBe("/");
    expect(languagePath("/whats-on", "gu")).toBe("/gu/whats-on");
    expect(languagePath("/gu/whats-on", "hi")).toBe("/hi/whats-on");
    expect(languagePath("/hi/mandirs/x", "gu")).toBe("/gu/mandirs/x");
    // Pages only in English go to that language's home page.
    expect(languagePath("/for-mandirs", "hi")).toBe("/hi");
    expect(languagePath("/for-mandirs", "en")).toBe("/for-mandirs");
  });
});

describe("the form's messages", () => {
  it("say the same as the committee form's in English", () => {
    for (const [code, text] of Object.entries(EVENT_ERRORS)) {
      expect(en[`report.error.${code}` as keyof typeof en]).toBe(text);
    }
  });
});

describe("the season pages' words", () => {
  it("are the same in the translations as in lib/seasons.ts", () => {
    for (const season of SEASONS) {
      for (const field of [
        "period",
        "title",
        "description",
        "intro",
        "shareText",
      ] as const) {
        expect(
          en[`season.${season.slug}.${field}` as keyof typeof en],
          `${season.slug} ${field}`,
        ).toBe(season[field]);
      }
    }
  });
});

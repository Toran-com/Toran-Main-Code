import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { LOCALES, placeholders, translator } from "@/lib/i18n";

describe("translator", () => {
  it("fills in values", () => {
    const t = translator("en");
    expect(t("whatsOn.moreOnDay", { count: 3, day: "Saturday" })).toBe(
      "See all 3 on Saturday →",
    );
    expect(t("festival.atMandirs", { name: "Diwali" })).toBe(
      "Diwali at mandirs",
    );
  });

  it("counts one and many", () => {
    const t = translator("en");
    expect(t.count("whatsOn.count", 1)).toBe("1 event");
    expect(t.count("whatsOn.count", 3)).toBe("3 events");
    expect(translator("gu").count("whatsOn.count", 3)).toBe("3 કાર્યક્રમો");
  });

  it("uses English by default", () => {
    expect(translator()("shell.mandirs")).toBe("Mandirs");
  });
});

describe("the Gujarati draft", () => {
  it("is not shown to the public until a native speaker has checked it", () => {
    expect(LOCALES.gu.ready).toBe(false);
  });

  it.each(Object.keys(en) as (keyof typeof en)[])(
    "%s keeps the same {values} as the English",
    (key) => {
      expect(placeholders(gu[key])).toEqual(placeholders(en[key]));
    },
  );

  it("is in Gujarati script", () => {
    const gujarati = /[઀-૿]/;
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => !gujarati.test(gu[key]) && gu[key] !== en[key],
    );
    expect(untranslated).toEqual([]);
  });
});

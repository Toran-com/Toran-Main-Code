import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { hi } from "@/lib/i18n/hi";
import { ta } from "@/lib/i18n/ta";
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
    expect(translator("hi").count("sevaList.free", 1)).toBe("1 जगह खाली");
    expect(translator("hi").count("sevaList.free", 3)).toBe("3 जगहें खाली");
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

describe("the Hindi draft", () => {
  it("is not shown to the public until a native speaker has checked it", () => {
    expect(LOCALES.hi.ready).toBe(false);
  });

  it.each(Object.keys(en) as (keyof typeof en)[])(
    "%s keeps the same {values} as the English",
    (key) => {
      expect(placeholders(hi[key])).toEqual(placeholders(en[key]));
    },
  );

  it("is in Devanagari script", () => {
    const devanagari = /[\u0900-\u097F]/;
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => !devanagari.test(hi[key]) && hi[key] !== en[key],
    );
    expect(untranslated).toEqual([]);
  });
});

describe("the Tamil draft", () => {
  it("is marked as not checked yet", () => {
    expect(LOCALES.ta.ready).toBe(false);
  });

  it("keeps every placeholder", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ta[key])).toEqual(placeholders(en[key]));
    }
  });

  it("is written in Tamil script, apart from names that stay in English", () => {
    const tamil = /[\u0B80-\u0BFF]/;
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => !tamil.test(ta[key]) && ta[key] !== en[key],
    );
    expect(untranslated).toEqual([]);
  });

  it("counts places in Tamil", () => {
    expect(translator("ta").count("sevaList.free", 1)).toBe(
      "1 இடம் காலியாக உள்ளது",
    );
    expect(translator("ta").count("sevaList.free", 3)).toBe(
      "3 இடங்கள் காலியாக உள்ளன",
    );
  });
});

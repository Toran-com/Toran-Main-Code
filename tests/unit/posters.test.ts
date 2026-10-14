import { describe, expect, it } from "vitest";
import { checkLink, posterFrom } from "@/lib/posters";

const poster = {
  title: "Annakut darshan",
  date: "2026-11-09",
  time: "18:30",
  summary: "",
  repeat: "none",
  until: "",
  from: "whatsapp",
  link: "",
};

describe("posterFrom", () => {
  it("reads back a stored poster", () => {
    expect(posterFrom(poster)).toEqual(poster);
  });

  it("drops anything that isn't an event detail", () => {
    expect(posterFrom({ ...poster, forwardedBy: "07700 900000" })).toEqual(
      poster,
    );
  });

  it("keeps the Gujarati name and description when given", () => {
    const gujarati = {
      title_gu: "અન્નકૂટ દર્શન",
      summary_gu: "સૌનું સ્વાગત છે.",
    };
    expect(posterFrom({ ...poster, ...gujarati })).toEqual({
      ...poster,
      ...gujarati,
    });
    // Empty or not text: left out.
    expect(posterFrom({ ...poster, title_gu: "", summary_gu: 3 })).toEqual(
      poster,
    );
  });

  it.each([
    null,
    "Annakut",
    [poster],
    { ...poster, title: 3 },
    { ...poster, from: "carrier pigeon" },
    { title: "Annakut" },
    { ...poster, link: "javascript:alert(1)" },
  ])("refuses %o", (value) => {
    expect(posterFrom(value)).toBeNull();
  });
});

describe("checkLink", () => {
  it.each([
    ["", true],
    ["https://example.org/diwali", true],
    ["http://example.org", true],
    ["example.org", false],
    ["javascript:alert(1)", false],
    ["https://example.org/a b", false],
  ])("%s is %s", (link, ok) => {
    expect(checkLink(link)).toBe(ok);
  });
});

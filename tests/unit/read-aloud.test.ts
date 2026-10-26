import { describe, expect, it } from "vitest";
import { pickVoice, readingText, sentences } from "@/lib/read-aloud";

describe("reading a page aloud", () => {
  it("joins the parts as sentences, leaving out empty ones", () => {
    expect(
      readingText([
        "Navratri garba",
        null,
        "Saturday 24 October, 7:30pm",
        "",
        "Free parking behind the hall.",
        false,
      ]),
    ).toBe(
      "Navratri garba. Saturday 24 October, 7:30pm. Free parking behind the hall.",
    );
  });

  it("reads a sentence at a time, in English or Gujarati", () => {
    expect(sentences("One. Two? Three!\nFour")).toEqual([
      "One.",
      "Two?",
      "Three!",
      "Four",
    ]);
    expect(sentences("નવરાત્રી ગરબા. શનિવાર, સાંજે 7:30.")).toEqual([
      "નવરાત્રી ગરબા.",
      "શનિવાર, સાંજે 7:30.",
    ]);
  });

  it("picks a voice for the page's language", () => {
    const voices = [
      { lang: "en-US", name: "US" },
      { lang: "en-GB", name: "UK" },
      { lang: "gu_IN", name: "Gujarati" },
    ];
    expect(pickVoice(voices, "en-GB")?.name).toBe("UK");
    expect(pickVoice(voices, "gu-IN")?.name).toBe("Gujarati");
    expect(pickVoice([{ lang: "en-US", name: "US" }], "en-GB")?.name).toBe(
      "US",
    );
    expect(pickVoice([{ lang: "en-GB", name: "UK" }], "gu-IN")).toBeNull();
  });
});

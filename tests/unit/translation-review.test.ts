import { describe, expect, it } from "vitest";
import {
  lineStamp,
  parseStamps,
  reviewerText,
  reviewLines,
  stampsFor,
  toReview,
} from "@/lib/translation-review";

const english = {
  "shell.home": "Toran home",
  "shell.find": "Find",
  "region.East Midlands": "East Midlands",
};
const gujarati = {
  "shell.home": "તોરણ મુખ્ય પાનું",
  "shell.find": "શોધો",
  "region.East Midlands": "ઈસ્ટ મિડલેન્ડ્સ",
};

describe("the Gujarati review pack", () => {
  it("marks lines nobody has checked as new", () => {
    const lines = reviewLines(english, gujarati, new Map());
    expect(lines.map((l) => [l.number, l.status])).toEqual([
      [1, "new"],
      [2, "new"],
      [3, "new"],
    ]);
  });

  it("leaves out checked lines, and marks changed ones with what they said", () => {
    const lines = reviewLines(
      english,
      gujarati,
      new Map([
        ["shell.home", { english: "Toran home", gujarati: "તોરણ મુખ્ય પાનું" }],
        ["shell.find", { english: "Search", gujarati: "શોધો" }],
      ]),
    );
    expect(lines.map((l) => l.status)).toEqual(["checked", "changed", "new"]);
    expect(lines[1].was).toEqual({ english: "Search", gujarati: "શોધો" });
    // The numbers stay those of the full list.
    expect(toReview(lines).map((l) => l.number)).toEqual([2, 3]);
  });

  it("gives the reviewer numbered pairs, saying which have changed", () => {
    const lines = reviewLines(
      english,
      gujarati,
      new Map([["shell.find", { english: "Search", gujarati: "શોધો" }]]),
    );
    const text = reviewerText(toReview(lines).slice(0, 2));
    expect(text).toContain(
      "1. English: Toran home\n    ગુજરાતી: તોરણ મુખ્ય પાનું",
    );
    expect(text).toContain("2. (changed) English: Find");
  });

  it("stamps each line so a changed one isn't marked by mistake", () => {
    const lines = reviewLines(english, gujarati, new Map());
    const stamps = parseStamps(stampsFor(lines));
    expect([...stamps.keys()]).toEqual(Object.keys(english));
    expect(stamps.get("region.East Midlands")).toBe(
      lineStamp("East Midlands", "ઈસ્ટ મિડલેન્ડ્સ"),
    );
    expect(lineStamp("Find", "શોધો")).not.toBe(lineStamp("Find", "શોધ"));
    expect(parseStamps("nonsense\n:x\n")).toEqual(new Map());
    // As a browser sends it back.
    expect(parseStamps(stampsFor(lines).replace(/\n/g, "\r\n"))).toEqual(
      stamps,
    );
  });
});

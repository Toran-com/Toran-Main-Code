import { describe, expect, it } from "vitest";
import {
  clockLabel,
  compareEvents,
  duplicatesOf,
  looksTheSame,
  titleWords,
} from "@/lib/duplicates";

const on = (title: string, time = "", date = "2026-11-08") => ({
  title,
  date,
  time,
});

describe("titleWords", () => {
  it("keeps the words that say which event it is", () => {
    expect([...titleWords("Diwali Celebrations at the Mandir!")]).toEqual([
      "diwali",
    ]);
    expect([...titleWords("Bhajans and Kirtans")]).toEqual([
      "bhajan",
      "kirtan",
    ]);
  });

  it("spells each festival and puja one way", () => {
    expect([...titleWords("Deepavali Laxmi Poojan")]).toEqual([
      "diwali",
      "lakshmi",
      "puja",
    ]);
    expect([...titleWords("Annakoot Darshan & Nutan Varsh 2026")]).toEqual([
      "annakut",
      "newyear",
    ]);
    expect([...titleWords("Kaali Chaudash: Hanumanji Pujan")]).toEqual([
      "kalichaudas",
      "hanuman",
      "puja",
    ]);
    expect([...titleWords("Dhan Teras")]).toEqual(["dhanteras"]);
    expect([...titleWords("Dhanteras")]).toEqual(["dhanteras"]);
    expect([...titleWords("Sharad Poonam Raas")]).toEqual([
      "sharadpurnima",
      "raas",
    ]);
  });
});

describe("compareEvents", () => {
  it("knows the same event, however it's spelled", () => {
    expect(
      compareEvents(on("Annakoot Darshan"), on("Annakut darshan", "07:00")),
    ).toBe("same");
    expect(
      compareEvents(on("Chopda Poojan", "20:00"), on("Chopra pujan", "20:15")),
    ).toBe("same");
    expect(compareEvents(on("Diwali"), on("Diwali celebrations"))).toBe("same");
  });

  it("asks a person when it may be the same", () => {
    // One name inside the other.
    expect(
      compareEvents(
        on("Annakut"),
        on("Nutan Varsh and Annakut darshan", "07:00"),
      ),
    ).toBe("maybe");
    expect(
      compareEvents(
        on("Diwali: Chopda pujan", "20:00"),
        on("Chopda Pujan", "20:00"),
      ),
    ).toBe("maybe");
    // Most words in common, at about the same time.
    expect(
      compareEvents(
        on("Kali Chaudas: Hanuman pujan", "18:00"),
        on("Kaali Chaudash: Hanuman Chalisa", "17:30"),
      ),
    ).toBe("maybe");
    // The same name an hour or two apart: maybe a time typed wrong.
    expect(compareEvents(on("Aarti", "07:00"), on("Arti", "08:00"))).toBe(
      "maybe",
    );
  });

  it("keeps different events apart", () => {
    // Fireworks and the Chopda pujan on the same evening.
    expect(
      compareEvents(
        on("Diwali fireworks display", "19:30"),
        on("Diwali: Laxmi and Chopda pujan", "20:00"),
      ),
    ).toBe("different");
    // A morning and an evening aarti.
    expect(compareEvents(on("Aarti", "07:00"), on("Aarti", "19:00"))).toBe(
      "different",
    );
    expect(compareEvents(on("Hanuman Chalisa"), on("Ganesh puja"))).toBe(
      "different",
    );
    // Similar names hours apart.
    expect(
      compareEvents(on("Diwali puja", "10:00"), on("Diwali", "19:00")),
    ).toBe("different");
    // Another day.
    expect(compareEvents(on("Diwali"), on("Diwali", "", "2026-11-09"))).toBe(
      "different",
    );
  });

  it("looksTheSame is anything but different", () => {
    expect(looksTheSame(on("Annakut"), on("Annakut darshan"))).toBe(true);
    expect(looksTheSame(on("Youth quiz night"), on("Satsang"))).toBe(false);
  });
});

describe("duplicatesOf", () => {
  it("lists look-alikes surest first, never the item itself", () => {
    const item = { id: "c1", ...on("Annakut darshan") };
    expect(
      duplicatesOf(item, [
        { kind: "queue", id: "c1", ...on("Annakut darshan") },
        { kind: "queue", id: "c2", ...on("Annakut and New Year") },
        { kind: "event", id: "e1", ...on("Annakoot") },
        { kind: "event", id: "e2", ...on("Weekly aarti") },
      ]).map((c) => [c.id, c.verdict]),
    ).toEqual([
      ["e1", "same"],
      ["c2", "maybe"],
    ]);
  });
});

describe("clockLabel", () => {
  it("says the time the UK way", () => {
    expect(clockLabel("19:30")).toBe("7:30pm");
    expect(clockLabel("07:00")).toBe("7am");
    expect(clockLabel("12:00")).toBe("12pm");
    expect(clockLabel("")).toBe("all day");
  });
});

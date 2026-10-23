import { describe, expect, it } from "vitest";
import { eventPairs, mandirPairs } from "@/lib/duplicate-report";

const ev = (id: string, title: string, date = "2026-11-08", time = "") => ({
  id,
  title,
  date,
  time,
});

describe("eventPairs", () => {
  it("pairs copies at one mandir, surest first, then soonest", () => {
    const pairs = eventPairs([
      ev("e1", "Diwali", "2026-11-08"),
      ev("e2", "Deepavali", "2026-11-08"),
      ev("e3", "Annakut", "2026-11-09"),
      ev("e4", "Nutan Varsh and Annakut", "2026-11-09", "07:00"),
      ev("e5", "Fireworks", "2026-11-08", "20:00"),
    ]);
    expect(pairs.map((p) => [p.a.id, p.b.id, p.verdict])).toEqual([
      ["e1", "e2", "same"],
      ["e3", "e4", "maybe"],
    ]);
  });

  it("pairs a repeating event once, and leaves out pairs kept apart", () => {
    const weekly = [
      ev("e1", "Aarti", "2026-11-01", "19:00"),
      ev("e1", "Aarti", "2026-11-08", "19:00"),
      ev("e2", "Arti", "2026-11-01", "19:00"),
      ev("e2", "Arti", "2026-11-08", "19:00"),
    ];
    expect(eventPairs(weekly)).toHaveLength(1);
    expect(eventPairs(weekly, new Set(["e1|e2"]))).toHaveLength(0);
  });
});

describe("mandirPairs", () => {
  const m = (
    id: string,
    name: string,
    town: string,
    postcode: string | null,
  ) => ({
    id,
    slug: id,
    name,
    town,
    postcode,
  });

  it("finds a mandir listed twice by postcode or name", () => {
    const pairs = mandirPairs([
      m("a", "Shree Jalaram Mandir", "Greenford", "UB6 9QT"),
      m("b", "Jalaram Mandir Greenford", "Greenford", null),
      m("c", "Hindu Temple", "Bristol", "BS5 6NU"),
      m("d", "Bristol Hindu Temple", "Bristol", "bs5 6nu"),
      m("e", "Geeta Bhavan", "Leicester", "LE2 0AA"),
      m("f", "Shree Sanatan Mandir", "Leicester", "LE4 6AR"),
    ]);
    expect(pairs.map((p) => [p.a.id, p.b.id, p.why])).toEqual([
      ["a", "b", "name"],
      ["c", "d", "postcode"],
    ]);
  });
});

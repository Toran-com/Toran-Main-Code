import { describe, expect, it } from "vitest";
import { mandirSlug, parseWebsiteEvents } from "@/lib/website-import";

const now = new Date("2026-10-21T09:00:00Z");
const row = (...cells: string[]) => cells.join("\t");

describe("mandirSlug", () => {
  it("takes a slug, a path or a full address", () => {
    expect(mandirSlug("reading-hindu-temple")).toBe("reading-hindu-temple");
    expect(mandirSlug("/mandirs/reading-hindu-temple")).toBe(
      "reading-hindu-temple",
    );
    expect(
      mandirSlug(
        "https://toran-main-code.vercel.app/mandirs/reading-hindu-temple/",
      ),
    ).toBe("reading-hindu-temple");
    expect(mandirSlug("Reading Hindu Temple")).toBeNull();
  });
});

describe("parseWebsiteEvents", () => {
  it("reads rows copied from a spreadsheet", () => {
    const { rows, problems } = parseWebsiteEvents(
      [
        row(
          "mandir",
          "date",
          "time",
          "title",
          "link",
          "kind",
          "summary",
          "title_gu",
        ),
        row(
          "/mandirs/reading-hindu-temple",
          "2026-11-08",
          "18:30",
          "Diwali Lakshmi puja",
          "https://example.org/diwali",
          "Festival",
          "Puja, then fireworks.",
          "દિવાળી લક્ષ્મી પૂજન",
        ),
        "",
        row(
          "slough-hindu-mandir",
          "2026-11-10",
          "",
          "Annakut darshan",
          "https://example.org/annakut",
        ),
      ].join("\r\n"),
      now,
    );
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        slug: "reading-hindu-temple",
        link: "https://example.org/diwali",
        input: {
          title: "Diwali Lakshmi puja",
          date: "2026-11-08",
          time: "18:30",
          summary: "Puja, then fireworks.",
          repeat: "none",
          until: "",
          title_gu: "દિવાળી લક્ષ્મી પૂજન",
          kind: "festival",
        },
      },
      {
        line: 4,
        slug: "slough-hindu-mandir",
        link: "https://example.org/annakut",
        input: {
          title: "Annakut darshan",
          date: "2026-11-10",
          time: "",
          summary: "",
          repeat: "none",
          until: "",
          title_gu: "",
          kind: "other",
        },
      },
    ]);
  });

  it("says what's wrong with each bad row and keeps the good ones", () => {
    const { rows, problems } = parseWebsiteEvents(
      [
        row("a-mandir", "2026-11-08", "7:30", "Good", "https://example.org/1"),
        row("a-mandir", "2026-11-08", "", "Short"),
        row(
          "A Mandir",
          "2026-11-08",
          "",
          "Bad mandir",
          "https://example.org/2",
        ),
        row("a-mandir", "2026-11-08", "", "No link", ""),
        row("a-mandir", "2026-11-08", "", "Bad link", "javascript:alert(1)"),
        row("a-mandir", "2025-11-08", "", "Last year", "https://example.org/3"),
        row(
          "a-mandir",
          "2026-11-08",
          "25:00",
          "Bad time",
          "https://example.org/4",
        ),
        row(
          "a-mandir",
          "2026-11-08",
          "",
          "Bad kind",
          "https://example.org/5",
          "disco",
        ),
        row("a-mandir", "2026-11-08", "", "good", "https://example.org/6"),
      ].join("\n"),
      now,
    );
    expect(rows.map((r) => [r.line, r.input.time])).toEqual([[1, "07:30"]]);
    expect(problems).toEqual([
      { line: 2, problem: "columns" },
      { line: 3, problem: "mandir" },
      { line: 4, problem: "link" },
      { line: 5, problem: "link" },
      { line: 6, problem: "date" },
      { line: 7, problem: "time" },
      { line: 8, problem: "kind" },
      { line: 9, problem: "repeated" },
    ]);
  });

  it("reads at most 200 rows", () => {
    const many = Array.from({ length: 205 }, (_, i) =>
      row("a-mandir", "2026-11-08", "", `Event ${i}`, "https://example.org/x"),
    ).join("\n");
    const { rows, problems } = parseWebsiteEvents(many, now);
    expect(rows).toHaveLength(200);
    expect(problems).toEqual([{ line: 201, problem: "toomany" }]);
  });
});

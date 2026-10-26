import { describe, expect, it } from "vitest";
import {
  csvCell,
  EXPORT_COLUMNS,
  exportRows,
  type ExportEvent,
  toCsv,
} from "@/lib/committee-export";

const event = (over: Partial<ExportEvent>): ExportEvent => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Diwali",
  title_gu: null,
  kind: "festival",
  starts_at: "2026-11-08T18:00:00Z",
  ends_at: "2026-11-08T21:30:00Z",
  all_day: false,
  recurrence: null,
  status: "published",
  seva_open: false,
  ...over,
});

describe("a committee's spreadsheet file", () => {
  it("quotes what needs quoting, and never runs a formula", () => {
    expect(csvCell("Diwali")).toBe("Diwali");
    expect(csvCell('Aarti, then "prasad"')).toBe('"Aarti, then ""prasad"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-1+2")).toBe("'-1+2");
    expect(csvCell(12)).toBe("12");
  });

  it("opens in Excel with Gujarati intact", () => {
    const file = toCsv([
      ["Event", "Gujarati name"],
      ["Diwali", "દિવાળી"],
    ]);
    expect(file.startsWith("\uFEFFEvent,Gujarati name\r\n")).toBe(true);
    expect(file).toContain("Diwali,દિવાળી\r\n");
  });

  it("lists the period's events and what's coming up, with their numbers", () => {
    const rows = exportRows({
      events: [
        event({
          id: "22222222-2222-4222-8222-222222222222",
          title: "Sharad Purnima garba",
          title_gu: "શરદ પૂર્ણિમા ગરબા",
          kind: "garba",
          starts_at: "2026-10-06T18:30:00Z",
          ends_at: null,
          seva_open: true,
        }),
        event({}),
        event({
          id: "55555555-5555-4555-8555-555555555555",
          title: "Summer satsang",
          starts_at: "2026-06-06T09:00:00Z",
          recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20260829",
        }),
        event({
          id: "33333333-3333-4333-8333-333333333333",
          title: "Last year's Diwali",
          starts_at: "2025-10-20T18:00:00Z",
        }),
        event({
          id: "44444444-4444-4444-8444-444444444444",
          title: "Hanuman Chalisa",
          kind: "bhajan",
          starts_at: "2026-01-03T09:00:00Z",
          all_day: true,
          recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20270131",
          status: "draft",
        }),
      ],
      numbers: {
        totals: { view: 50, calendar: 4, subscribe: 1, share: 3 },
        pageViews: 20,
        events: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            views: 30,
            calendar: 4,
            share: 3,
          },
        ],
      },
      since: "2026-09-28",
      slug: "shree-mandir",
      origin: "https://toran.example",
    });
    expect(rows[0]).toEqual([...EXPORT_COLUMNS]);
    expect(rows[1]).toEqual([
      "",
      "",
      "",
      "Your mandir's page",
      "",
      "",
      "",
      "",
      "",
      "https://toran.example/mandirs/shree-mandir",
      20,
      "",
      "",
    ]);
    // Last year's one-off and the summer's finished series are left out;
    // the weekly one still going stays, first by date.
    expect(rows.slice(2).map((r) => r[3])).toEqual([
      "Hanuman Chalisa",
      "Sharad Purnima garba",
      "Diwali",
    ]);
    const [weekly, garba, diwali] = rows.slice(2);
    expect(weekly.slice(1, 3)).toEqual(["All day", ""]);
    expect(weekly[6]).toMatch(/Saturday/);
    expect(weekly[7]).toBe("Draft");
    expect(garba).toEqual([
      "2026-10-06",
      "19:30",
      "",
      "Sharad Purnima garba",
      "શરદ પૂર્ણિમા ગરબા",
      expect.any(String),
      "",
      "On the site",
      "Open",
      "https://toran.example/mandirs/shree-mandir/events/22222222-2222-4222-8222-222222222222",
      30,
      4,
      3,
    ]);
    expect(diwali.slice(0, 3)).toEqual(["2026-11-08", "18:00", "21:30"]);
    expect(diwali.slice(10)).toEqual([0, 0, 0]);
  });
});

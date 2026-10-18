import { describe, expect, it } from "vitest";
import {
  datesForMandir,
  festivalPicks,
  type FestivalDateRow,
  lastYearPicks,
  lastYearWindow,
  type PastEvent,
  picksFromForm,
} from "@/lib/quick-events";

const DIWALI = "f0000000-0000-0000-0000-00000000d1a1";
const ANNAKUT = "f0000000-0000-0000-0000-0000000a2a2a";
const NAVRATRI = "f0000000-0000-0000-0000-0000000a7a7a";

function row(
  id: string,
  festival_id: string,
  starts_on: string,
  calendar: string | null = null,
): FestivalDateRow {
  const names: Record<string, [string, string]> = {
    [DIWALI]: ["diwali", "Diwali"],
    [ANNAKUT]: ["annakut", "Annakut and New Year"],
    [NAVRATRI]: ["navratri", "Navratri"],
  };
  const [slug, name] = names[festival_id];
  return { id, festival_id, calendar, starts_on, festival: { slug, name } };
}

const ROWS = [
  row("d-2025", DIWALI, "2025-10-21"),
  row("d-2026", DIWALI, "2026-11-08"),
  row("a-2026-guj", ANNAKUT, "2026-11-10", "gujarati"),
  row("a-2026-north", ANNAKUT, "2026-11-09", "north_indian"),
  row("n-2026", NAVRATRI, "2026-10-11"),
  row("n-2027", NAVRATRI, "2027-09-30"),
];

function past(overrides: Partial<PastEvent>): PastEvent {
  return {
    title: "Event",
    summary: null,
    title_gu: null,
    summary_gu: null,
    kind: "other",
    starts_at: "2025-10-25T18:00:00Z",
    all_day: false,
    festival_date: null,
    ...overrides,
  };
}

describe("datesForMandir", () => {
  it("prefers the mandir's own calendar, then the shared date", () => {
    const north = datesForMandir(ROWS, "north_indian").map((r) => r.id);
    expect(north).toContain("a-2026-north");
    expect(north).not.toContain("a-2026-guj");
    // No shared Annakut date: a mandir without a calendar gets one of them.
    expect(
      datesForMandir(ROWS, null).filter((r) => r.festival_id === ANNAKUT),
    ).toHaveLength(1);
  });
});

describe("festivalPicks", () => {
  it("offers the festivals in the next three months, all day", () => {
    const picks = festivalPicks(ROWS, "gujarati", [], "2026-10-18");
    expect(picks.map((p) => [p.title, p.date])).toEqual([
      ["Diwali", "2026-11-08"],
      ["Annakut and New Year", "2026-11-10"],
    ]);
    expect(picks[0]).toMatchObject({
      time: "",
      kind: "festival",
      festivalDateId: "d-2026",
    });
  });

  it("leaves out festivals the page already has", () => {
    const linked = festivalPicks(
      ROWS,
      "gujarati",
      [
        {
          title: "Lights",
          starts_at: "2026-11-08T18:00:00Z",
          festival_date_id: "d-2026",
        },
      ],
      "2026-10-18",
    );
    expect(linked.map((p) => p.title)).toEqual(["Annakut and New Year"]);
    const named = festivalPicks(
      ROWS,
      "gujarati",
      [
        {
          title: "Bestu Varas celebrations",
          starts_at: "2026-11-10T09:00:00Z",
          festival_date_id: null,
        },
      ],
      "2026-10-18",
    );
    expect(named.map((p) => p.title)).toEqual(["Diwali"]);
  });
});

describe("lastYearPicks", () => {
  it("moves a festival event to the same day around this year's festival", () => {
    // Fireworks the evening before Diwali 2025, at 7pm UK time.
    const picks = lastYearPicks(
      [
        past({
          title: "Fireworks",
          kind: "festival",
          starts_at: "2025-10-20T18:00:00Z",
          festival_date: { festival_id: DIWALI, starts_on: "2025-10-21" },
        }),
      ],
      ROWS,
      "gujarati",
      [],
      "2026-10-18",
    );
    expect(picks).toEqual([
      expect.objectContaining({
        title: "Fireworks",
        date: "2026-11-07",
        time: "19:00",
        kind: "festival",
        festivalDateId: "d-2026",
        note: "Last year: Mon 20 Oct 2025",
      }),
    ]);
  });

  it("follows a festival named in the title, or moves 52 weeks on", () => {
    const picks = lastYearPicks(
      [
        past({ title: "Diwali dinner", starts_at: "2025-10-21T17:00:00Z" }),
        past({ title: "Youth quiz", starts_at: "2025-11-01T14:00:00Z" }),
      ],
      ROWS,
      "gujarati",
      [],
      "2026-10-18",
    );
    expect(picks.map((p) => [p.title, p.date, p.festivalDateId])).toEqual([
      ["Youth quiz", "2026-10-31", null],
      ["Diwali dinner", "2026-11-08", "d-2026"],
    ]);
  });

  it("keeps all-day events all day, and skips past or already added ones", () => {
    const picks = lastYearPicks(
      [
        past({ title: "Sharad Purnima", starts_at: "2025-10-06T23:00:00Z" }),
        past({
          title: "Seva day",
          all_day: true,
          starts_at: "2025-11-14T00:00:00Z",
        }),
        past({ title: "Bhajan night", starts_at: "2025-11-07T19:00:00Z" }),
      ],
      ROWS,
      "gujarati",
      [
        {
          title: "bhajan night ",
          starts_at: "2026-11-06T19:30:00Z",
          festival_date_id: null,
        },
      ],
      "2026-10-18",
    );
    expect(picks.map((p) => [p.title, p.date, p.time])).toEqual([
      ["Seva day", "2026-11-13", ""],
    ]);
  });
});

describe("lastYearWindow", () => {
  it("looks back far enough for the next four months", () => {
    expect(lastYearWindow("2026-10-18")).toEqual({
      from: "2025-09-13T00:00:00Z",
      to: "2026-02-17T00:00:00Z",
    });
  });
});

describe("picksFromForm", () => {
  it("reads only the ticked rows, once each", () => {
    const form = new FormData();
    form.append("pick", "1");
    form.append("pick", "1");
    form.append("pick", "x");
    form.set("title-0", "Not ticked");
    form.set("title-1", " Diwali ");
    form.set("date-1", "2026-11-08");
    form.set("time-1", "18:30");
    form.set("kind-1", "festival");
    form.set("festival-1", "f0000000-0000-0000-0000-00000000d1a1");
    expect(picksFromForm(form)).toEqual([
      {
        input: {
          title: "Diwali",
          date: "2026-11-08",
          time: "18:30",
          summary: "",
          repeat: "none",
          until: "",
          title_gu: "",
          summary_gu: "",
          kind: "festival",
        },
        festivalDateId: "f0000000-0000-0000-0000-00000000d1a1",
      },
    ]);
  });

  it("ignores a festival link that isn't an id", () => {
    const form = new FormData();
    form.append("pick", "0");
    form.set("title-0", "Diwali");
    form.set("festival-0", "'; drop table events");
    expect(picksFromForm(form)[0].festivalDateId).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  anchorFor,
  calendarLabel,
  formatDateRange,
  formatEventStart,
  formatEventWhen,
  groupByRegionAndTown,
  londonDate,
  londonTime,
  londonToUtc,
  matchesSearch,
  monthOf,
  timeTileParts,
  websiteLabel,
} from "@/lib/format";

describe("londonDate", () => {
  it("uses London's date, not UTC's, during British Summer Time", () => {
    expect(londonDate(new Date("2026-10-11T23:30:00Z"))).toBe("2026-10-12");
  });
  it("matches UTC in winter", () => {
    expect(londonDate(new Date("2026-11-08T23:30:00Z"))).toBe("2026-11-08");
  });
});

describe("londonTime", () => {
  it("gives London's 24-hour time in summer and winter", () => {
    expect(londonTime(new Date("2026-10-17T18:30:00Z"))).toBe("19:30");
    expect(londonTime(new Date("2026-11-08T18:30:00Z"))).toBe("18:30");
    expect(londonTime(new Date("2026-11-08T00:05:00Z"))).toBe("00:05");
  });
});

describe("formatDateRange", () => {
  it("shows a single day", () => {
    expect(formatDateRange("2026-11-08", "2026-11-08")).toBe("Sun 8 Nov 2026");
  });
  it("shows a range within a year once", () => {
    expect(formatDateRange("2026-10-11", "2026-10-19")).toBe(
      "Sun 11 Oct – Mon 19 Oct 2026",
    );
  });
  it("shows both years across new year", () => {
    expect(formatDateRange("2026-12-31", "2027-01-01")).toBe(
      "Thu 31 Dec 2026 – Fri 1 Jan 2027",
    );
  });
});

describe("formatEventStart", () => {
  it("shows UK time in summer", () => {
    expect(formatEventStart("2026-10-11T18:00:00Z", false)).toBe(
      "Sun 11 Oct, 7pm",
    );
  });
  it("shows minutes when there are some", () => {
    expect(formatEventStart("2026-11-08T18:30:00Z", false)).toBe(
      "Sun 8 Nov, 6:30pm",
    );
  });
  it("leaves the time out for all-day events", () => {
    expect(formatEventStart("2026-11-08T00:00:00Z", true)).toBe("Sun 8 Nov");
  });
});

describe("labels", () => {
  it("names calendars and months", () => {
    expect(calendarLabel("gujarati")).toBe("Gujarati calendar");
    expect(calendarLabel(null)).toBeNull();
    expect(monthOf("2026-11-08")).toBe("November 2026");
  });
  it("shortens websites and makes anchors", () => {
    expect(websiteLabel("https://www.derbyhindutemple.com/")).toBe(
      "derbyhindutemple.com",
    );
    expect(anchorFor("East of England")).toBe("east-of-england");
  });
});

describe("groupByRegionAndTown", () => {
  it("groups and sorts regions, towns and names", () => {
    const groups = groupByRegionAndTown([
      { name: "Shree Ram Mandir", town: "Leicester", region: "East Midlands" },
      { name: "Geeta Bhawan", town: "Derby", region: "East Midlands" },
      { name: "BAPS Neasden", town: "Brent", region: "London" },
      { name: "Geeta Bhavan", town: "Leicester", region: "East Midlands" },
    ]);
    expect(groups.map((g) => g.region)).toEqual(["East Midlands", "London"]);
    expect(groups[0].towns.map((t) => t.town)).toEqual(["Derby", "Leicester"]);
    expect(groups[0].towns[1].mandirs.map((m) => m.name)).toEqual([
      "Geeta Bhavan",
      "Shree Ram Mandir",
    ]);
  });
});

describe("matchesSearch", () => {
  const m = {
    name: "BAPS Shri Swaminarayan Mandir",
    town: "Leicester",
    region: "East Midlands",
    tradition: "Swaminarayan (BAPS)",
  };
  it("matches every word typed, in any field", () => {
    expect(matchesSearch(m, "baps leicester")).toBe(true);
    expect(matchesSearch(m, "  ")).toBe(true);
    expect(matchesSearch(m, "baps leeds")).toBe(false);
  });
});

describe("londonToUtc", () => {
  it("takes an hour off in British Summer Time", () => {
    expect(londonToUtc("2026-10-11", "19:00")?.toISOString()).toBe(
      "2026-10-11T18:00:00.000Z",
    );
  });
  it("matches UTC in winter", () => {
    expect(londonToUtc("2026-11-08", "18:30")?.toISOString()).toBe(
      "2026-11-08T18:30:00.000Z",
    );
  });
  it("handles the night the clocks go back", () => {
    expect(londonToUtc("2026-10-25", "00:30")?.toISOString()).toBe(
      "2026-10-24T23:30:00.000Z",
    );
    expect(londonToUtc("2026-10-25", "12:00")?.toISOString()).toBe(
      "2026-10-25T12:00:00.000Z",
    );
  });
  it("moves a time skipped when the clocks go forward", () => {
    expect(londonToUtc("2027-03-28", "01:30")?.toISOString()).toBe(
      "2027-03-28T01:30:00.000Z",
    );
  });
  it("rejects impossible dates and times", () => {
    expect(londonToUtc("2026-02-30", "10:00")).toBeNull();
    expect(londonToUtc("2026-10-11", "25:00")).toBeNull();
    expect(londonToUtc("11/10/2026", "10:00")).toBeNull();
  });
});

describe("formatEventWhen", () => {
  it("gives the end time on the same day", () => {
    expect(
      formatEventWhen("2026-10-24T18:30:00Z", "2026-10-24T22:00:00Z", false),
    ).toBe("Sat 24 Oct, 7:30pm – 11pm");
  });

  it("gives the end day when it runs past midnight", () => {
    expect(
      formatEventWhen("2026-10-24T21:00:00Z", "2026-10-25T01:00:00Z", false),
    ).toBe("Sat 24 Oct, 10pm – Sun 25 Oct, 1am");
  });

  it("shows only the start without an end, or with a muddled one", () => {
    expect(formatEventWhen("2026-10-24T18:30:00Z", null, false)).toBe(
      "Sat 24 Oct, 7:30pm",
    );
    expect(
      formatEventWhen("2026-10-24T18:30:00Z", "2026-10-24T18:00:00Z", false),
    ).toBe("Sat 24 Oct, 7:30pm");
  });

  it("gives dates for all-day events", () => {
    expect(
      formatEventWhen("2026-11-08T00:00:00Z", "2026-11-08T00:00:00Z", true),
    ).toBe("Sun 8 Nov");
    expect(
      formatEventWhen("2026-11-07T00:00:00Z", "2026-11-08T00:00:00Z", true),
    ).toBe("Sat 7 Nov – Sun 8 Nov");
  });
});

describe("timeTileParts", () => {
  it("splits the UK time into the clock and am or pm", () => {
    expect(timeTileParts("2026-10-17T18:30:00Z")).toEqual({
      clock: "7:30",
      part: "pm",
    });
    expect(timeTileParts("2026-11-08T07:00:00Z")).toEqual({
      clock: "7",
      part: "am",
    });
    expect(timeTileParts("2026-11-08T12:00:00Z")).toEqual({
      clock: "12",
      part: "pm",
    });
  });
});

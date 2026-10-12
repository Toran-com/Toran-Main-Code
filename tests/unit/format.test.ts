import { describe, expect, it } from "vitest";
import {
  anchorFor,
  calendarLabel,
  formatDateRange,
  formatEventStart,
  groupByRegionAndTown,
  londonDate,
  matchesSearch,
  monthOf,
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

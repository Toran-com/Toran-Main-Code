import { describe, expect, it } from "vitest";
import { checkEvent, type EventInput, eventInputFrom } from "@/lib/event-form";

// Tuesday 13 October 2026, midday in London.
const now = new Date("2026-10-13T11:00:00Z");
const base: EventInput = {
  title: "Diwali celebrations",
  date: "2026-11-08",
  time: "18:30",
  summary: "",
  repeat: "none",
  until: "",
};

describe("checkEvent", () => {
  it("accepts a one-off event, in London time", () => {
    const result = checkEvent(base, now);
    expect(result.ok && result.event).toMatchObject({
      title: "Diwali celebrations",
      summary: null,
      allDay: false,
      rule: null,
      occurrences: [],
    });
    // 8 November is after the clocks go back: 18:30 London is 18:30 UTC.
    expect(result.ok && result.event.startsAt.toISOString()).toBe(
      "2026-11-08T18:30:00.000Z",
    );
  });

  it("treats an empty time as all day", () => {
    const result = checkEvent({ ...base, time: "" }, now);
    expect(result.ok && result.event.allDay).toBe(true);
  });

  it.each([
    [{ title: "x" }, "title"],
    [{ summary: "a".repeat(281) }, "summary"],
    [{ date: "2026-10-12" }, "date"],
    [{ date: "2029-01-01" }, "date"],
    [{ date: "8/11/2026" }, "date"],
    [{ time: "25:00" }, "time"],
    [{ repeat: "yearly" }, "repeat"],
    [{ repeat: "weekly", until: "2026-11-01" }, "until"],
    [{ repeat: "weekly", until: "2028-01-01" }, "until"],
  ])("rejects %o as %s", (change, error) => {
    expect(checkEvent({ ...base, ...change }, now)).toEqual({
      ok: false,
      error,
    });
  });

  it("works out every date of a weekly event", () => {
    const result = checkEvent(
      {
        ...base,
        date: "2026-10-17",
        time: "19:00",
        repeat: "weekly",
        until: "2026-11-07",
      },
      now,
    );
    expect(result.ok && result.event.rule).toMatch(/^RRULE:FREQ=WEEKLY/);
    // 17 Oct is British Summer Time (18:00 UTC); from 31 Oct it's 19:00 UTC.
    expect(
      result.ok && result.event.occurrences.map((d) => d.toISOString()),
    ).toEqual([
      "2026-10-17T18:00:00.000Z",
      "2026-10-24T18:00:00.000Z",
      "2026-10-31T19:00:00.000Z",
      "2026-11-07T19:00:00.000Z",
    ]);
  });
});

describe("eventInputFrom", () => {
  it("reads and trims form fields, defaulting to no repeat", () => {
    const form = new FormData();
    form.set("title", "  Aarti ");
    form.set("date", "2026-10-17");
    expect(eventInputFrom(form)).toEqual({
      title: "Aarti",
      date: "2026-10-17",
      time: "",
      summary: "",
      repeat: "none",
      until: "",
    });
  });
});

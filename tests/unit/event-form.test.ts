import { describe, expect, it } from "vitest";
import {
  checkEvent,
  type EventInput,
  eventInputFrom,
  eventInputFromEvent,
} from "@/lib/event-form";

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
      title_gu: "",
      summary_gu: "",
      kind: "other",
    });
  });

  it("reads the Gujarati fields", () => {
    const form = new FormData();
    form.set("title_gu", " દિવાળી ");
    form.set("summary_gu", "સૌનું સ્વાગત છે.");
    expect(eventInputFrom(form)).toMatchObject({
      title_gu: "દિવાળી",
      summary_gu: "સૌનું સ્વાગત છે.",
    });
  });
});

describe("checkEvent in Gujarati", () => {
  it("keeps the Gujarati name and description", () => {
    const result = checkEvent(
      { ...base, title_gu: "દિવાળી ઉજવણી", summary_gu: "સૌનું સ્વાગત છે." },
      now,
    );
    expect(result.ok && result.event).toMatchObject({
      titleGu: "દિવાળી ઉજવણી",
      summaryGu: "સૌનું સ્વાગત છે.",
    });
  });

  it("treats missing or empty Gujarati as none", () => {
    for (const extra of [{}, { title_gu: "", summary_gu: "  " }]) {
      const result = checkEvent({ ...base, ...extra }, now);
      expect(result.ok && result.event).toMatchObject({
        titleGu: null,
        summaryGu: null,
      });
    }
  });

  it("refuses a Gujarati name or description of the wrong length", () => {
    expect(checkEvent({ ...base, title_gu: "દ" }, now)).toEqual({
      ok: false,
      error: "titleGu",
    });
    expect(checkEvent({ ...base, summary_gu: "ક".repeat(281) }, now)).toEqual({
      ok: false,
      error: "summaryGu",
    });
  });
});

describe("eventInputFromEvent", () => {
  const stored = {
    title: "Aarti",
    summary: null,
    title_gu: "આરતી",
    summary_gu: null,
    all_day: false,
    recurrence: null,
    // 7:30pm in London during British Summer Time.
    next_starts_at: "2026-10-17T18:30:00.000Z",
  };

  it("fills the form in London time", () => {
    expect(eventInputFromEvent(stored)).toEqual({
      title: "Aarti",
      date: "2026-10-17",
      time: "19:30",
      summary: "",
      repeat: "none",
      until: "",
      title_gu: "આરતી",
      summary_gu: "",
      kind: "other",
    });
  });

  it("keeps the event's kind", () => {
    expect(eventInputFromEvent({ ...stored, kind: "festival" }).kind).toBe(
      "festival",
    );
  });

  it("leaves the time empty for an all-day event", () => {
    expect(eventInputFromEvent({ ...stored, all_day: true }).time).toBe("");
  });

  it("turns a stored repeat back into the form's choice", () => {
    const cases: [string, string][] = [
      ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261231", "weekly"],
      ["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA;UNTIL=20261231", "fortnightly"],
      ["RRULE:FREQ=MONTHLY;BYDAY=3SA;UNTIL=20261231", "monthly"],
      ["RRULE:FREQ=MONTHLY;BYDAY=-1SA;UNTIL=20261231", "monthly-last"],
    ];
    for (const [recurrence, repeat] of cases) {
      expect(eventInputFromEvent({ ...stored, recurrence })).toMatchObject({
        repeat,
        until: "2026-12-31",
      });
    }
  });

  it("gives back an event that checks out the same", () => {
    const input = eventInputFromEvent({
      ...stored,
      recurrence: "RRULE:FREQ=MONTHLY;BYDAY=3SA;UNTIL=20261231",
    });
    const result = checkEvent(input, now);
    expect(result.ok && result.event.rule).toBe(
      "RRULE:FREQ=MONTHLY;BYDAY=3SA;UNTIL=20261231",
    );
  });
});

describe("checkEvent kinds", () => {
  it("treats a missing kind as other", () => {
    const result = checkEvent(base, now);
    expect(result.ok && result.event.kind).toBe("other");
  });
  it("keeps a known kind", () => {
    const result = checkEvent({ ...base, kind: "festival" }, now);
    expect(result.ok && result.event.kind).toBe("festival");
  });
  it("refuses an unknown kind", () => {
    expect(checkEvent({ ...base, kind: "rave" }, now)).toEqual({
      ok: false,
      error: "kind",
    });
  });
});

describe("an event every day", () => {
  it("takes a festival's nine nights as one event", () => {
    const result = checkEvent(
      {
        ...base,
        date: "2026-11-01",
        time: "20:00",
        repeat: "daily",
        until: "2026-11-09",
      },
      now,
    );
    expect(result.ok && result.event.rule).toBe(
      "RRULE:FREQ=DAILY;UNTIL=20261109",
    );
    expect(result.ok && result.event.occurrences).toHaveLength(9);
    expect(result.ok && result.event.occurrences[8].toISOString()).toBe(
      "2026-11-09T20:00:00.000Z",
    );
  });

  it("keeps a run of days to a month", () => {
    expect(
      checkEvent(
        { ...base, date: "2026-11-01", repeat: "daily", until: "2026-12-15" },
        now,
      ),
    ).toEqual({ ok: false, error: "untilDaily" });
    expect(
      checkEvent(
        { ...base, date: "2026-11-01", repeat: "daily", until: "2026-12-01" },
        now,
      ).ok,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  calendarFile,
  escapeText,
  foldLine,
  googleCalendarLink,
  londonStamp,
  ruleFor,
  type CalendarEvent,
} from "@/lib/ical";

const now = new Date("2026-10-15T09:00:00Z");
const lines = (text: string) => text.replace(/\r\n /g, "").split("\r\n");

const aarti: CalendarEvent = {
  uid: "event-1@toran",
  title: "Sandhya aarti",
  description: "Everyone welcome",
  location: "Shree Ram Mandir, Leicester, LE4 6AR",
  url: "https://toran.example/mandirs/ram/events/1",
  start: "2026-10-20T18:00:00Z",
  end: "2026-10-20T19:00:00Z",
  allDay: false,
};

describe("calendar text", () => {
  it("escapes commas, semicolons, backslashes and new lines", () => {
    expect(escapeText("Aarti, bhajans; prasad\\\nAll welcome")).toBe(
      String.raw`Aarti\, bhajans\; prasad\\\nAll welcome`,
    );
  });

  it("folds long lines at 75 bytes without splitting Gujarati letters", () => {
    const line = `SUMMARY:${"અન્નકૂટ દર્શન ".repeat(8)}`;
    const folded = foldLine(line);
    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("writes UK local time, across the clocks changing", () => {
    expect(londonStamp("2026-10-20T18:00:00Z")).toBe("20261020T190000");
    expect(londonStamp("2026-11-03T19:00:00Z")).toBe("20261103T190000");
  });

  it("turns a rule's end date into a UTC moment for timed events", () => {
    const rule = "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131";
    expect(ruleFor(rule, false)).toBe(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131T235959Z",
    );
    expect(ruleFor(rule, true)).toBe(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131",
    );
  });
});

describe("calendarFile", () => {
  it("describes a timed event in UK time", () => {
    const text = calendarFile("Shree Ram Mandir · Toran", [aarti], now);
    expect(text.endsWith("\r\n")).toBe(true);
    const all = lines(text);
    expect(all[0]).toBe("BEGIN:VCALENDAR");
    expect(all).toContain("X-WR-CALNAME:Shree Ram Mandir · Toran");
    expect(all).toContain("TZID:Europe/London");
    expect(all).toContain("UID:event-1@toran");
    expect(all).toContain("DTSTAMP:20261015T090000Z");
    expect(all).toContain("DTSTART;TZID=Europe/London:20261020T190000");
    expect(all).toContain("DTEND;TZID=Europe/London:20261020T200000");
    expect(all).toContain("SUMMARY:Sandhya aarti");
    expect(all).toContain("LOCATION:Shree Ram Mandir\\, Leicester\\, LE4 6AR");
    expect(all).toContain("STATUS:CONFIRMED");
    expect(all.at(-2)).toBe("END:VCALENDAR");
  });

  it("gives all-day events dates, ending the day after", () => {
    const all = lines(
      calendarFile(
        "Festivals",
        [
          {
            uid: "festival-1@toran",
            title: "Navratri",
            start: "2026-10-11",
            end: "2026-10-19",
            allDay: true,
          },
        ],
        now,
      ),
    );
    expect(all).toContain("DTSTART;VALUE=DATE:20261011");
    expect(all).toContain("DTEND;VALUE=DATE:20261020");
  });

  it("repeats a weekly event and leaves out cancelled dates", () => {
    const all = lines(
      calendarFile(
        "Mandir",
        [
          {
            ...aarti,
            end: null,
            rule: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131",
            skip: ["2026-11-03T19:00:00Z"],
          },
        ],
        now,
      ),
    );
    expect(all).toContain(
      "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;UNTIL=20270131T235959Z",
    );
    expect(all).toContain("EXDATE;TZID=Europe/London:20261103T190000");
    expect(all.some((l) => l.startsWith("DTEND"))).toBe(false);
  });

  it("marks cancelled events", () => {
    const all = lines(calendarFile("M", [{ ...aarti, cancelled: true }], now));
    expect(all).toContain("STATUS:CANCELLED");
  });

  it("keeps an event's text from breaking the file", () => {
    const text = calendarFile(
      "M",
      [{ ...aarti, title: "Garba\nEND:VEVENT\nBEGIN:VEVENT" }],
      now,
    );
    expect(lines(text).filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });
});

describe("googleCalendarLink", () => {
  it("fills in a timed event", () => {
    const url = new URL(googleCalendarLink(aarti));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Sandhya aarti");
    expect(url.searchParams.get("dates")).toBe(
      "20261020T180000Z/20261020T190000Z",
    );
    expect(url.searchParams.get("location")).toContain("Leicester");
    expect(url.searchParams.get("details")).toContain(aarti.url);
  });

  it("uses dates for all-day events and carries a repeating rule", () => {
    const url = new URL(
      googleCalendarLink({
        uid: "x",
        title: "Monthly havan",
        start: "2026-11-01",
        allDay: true,
        rule: "RRULE:FREQ=MONTHLY;BYDAY=1SU;UNTIL=20270131",
      }),
    );
    expect(url.searchParams.get("dates")).toBe("20261101/20261102");
    expect(url.searchParams.get("recur")).toBe(
      "RRULE:FREQ=MONTHLY;BYDAY=1SU;UNTIL=20270131",
    );
  });
});

describe("reminders", () => {
  it("reminds two hours before a timed event someone adds", () => {
    const file = lines(calendarFile("Ram", [{ ...aarti, remind: true }], now));
    const alarm = file.slice(file.indexOf("BEGIN:VALARM"));
    expect(alarm.slice(0, 5)).toEqual([
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Sandhya aarti",
      "TRIGGER:-PT2H",
      "END:VALARM",
    ]);
    // Inside the event.
    expect(file.indexOf("END:VALARM")).toBeLessThan(file.indexOf("END:VEVENT"));
  });

  it("reminds the evening before an all-day event", () => {
    const file = calendarFile(
      "Ram",
      [
        {
          ...aarti,
          start: "2026-11-08",
          end: null,
          allDay: true,
          remind: true,
        },
      ],
      now,
    );
    expect(file).toContain("TRIGGER:-PT6H");
  });

  it("leaves reminders out of subscribed calendars and cancelled events", () => {
    expect(calendarFile("Ram", [aarti], now)).not.toContain("VALARM");
    expect(
      calendarFile("Ram", [{ ...aarti, remind: true, cancelled: true }], now),
    ).not.toContain("VALARM");
  });
});

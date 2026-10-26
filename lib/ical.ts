// Calendar files (iCalendar, RFC 5545) for "Add to calendar" and for
// calendars families subscribe to, so a mandir's events appear in their
// phone's calendar and stay up to date. Times are written in UK local time
// with the Europe/London rules included, so a weekly 7pm aarti stays at 7pm
// when the clocks change.

export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  // Timed events: ISO moments. All-day events: start and (inclusive) end
  // dates as YYYY-MM-DD.
  start: string;
  end?: string | null;
  allDay: boolean;
  // A stored RRULE ("RRULE:FREQ=WEEKLY;…"), for repeating events.
  rule?: string | null;
  // Dates of a repeating event that won't happen: ISO moments, or
  // YYYY-MM-DD for all-day events.
  skip?: string[];
  cancelled?: boolean;
  // A reminder: two hours before a timed event (time to get there), or at
  // 6pm the evening before an all-day one. Only for events someone adds
  // one at a time; a whole subscribed calendar of reminders would nag.
  remind?: boolean;
};

const LONDON = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// 2026-10-20T18:30:00Z → 20261020T193000 (UK time).
export function londonStamp(iso: string): string {
  const parts = Object.fromEntries(
    LONDON.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

// 2026-10-20T18:30:00.000Z → 20261020T183000Z
export function utcStamp(at: Date): string {
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

const dateStamp = (date: string) => date.replaceAll("-", "");

const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

// Commas, semicolons, backslashes and new lines must be escaped in text.
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes are folded: the rest continues on the next
// line after a space. Never splits a character (Gujarati letters are three
// bytes each).
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

// A stored rule ends on a date (UNTIL=20270131). For timed events the
// standard wants that as a UTC moment, so the last day is included in full.
export function ruleFor(rule: string, allDay: boolean): string {
  const body = rule.replace(/^RRULE:/, "");
  if (allDay) return body;
  return body.replace(/UNTIL=(\d{8})(?=;|$)/, "UNTIL=$1T235959Z");
}

const TIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/London",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function eventLines(event: CalendarEvent, now: Date): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
  ];
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(event.start)}`);
    lines.push(
      `DTEND;VALUE=DATE:${dateStamp(nextDay(event.end ?? event.start))}`,
    );
  } else {
    lines.push(`DTSTART;TZID=Europe/London:${londonStamp(event.start)}`);
    if (event.end) {
      lines.push(`DTEND;TZID=Europe/London:${londonStamp(event.end)}`);
    }
  }
  if (event.rule) lines.push(`RRULE:${ruleFor(event.rule, event.allDay)}`);
  for (const skipped of event.skip ?? []) {
    lines.push(
      event.allDay
        ? `EXDATE;VALUE=DATE:${dateStamp(skipped.slice(0, 10))}`
        : `EXDATE;TZID=Europe/London:${londonStamp(skipped)}`,
    );
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push(`STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`);
  if (event.remind && !event.cancelled) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.title)}`,
      `TRIGGER:${event.allDay ? "-PT6H" : "-PT2H"}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

// A whole calendar file. Subscribed calendars are asked to check again
// every few hours.
export function calendarFile(
  name: string,
  events: CalendarEvent[],
  now: Date = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Toran//Mandir events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...TIMEZONE,
    ...events.flatMap((event) => eventLines(event, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

// A link that opens Google Calendar with the event filled in, ready to
// save. Repeating events carry their rule.
export function googleCalendarLink(event: CalendarEvent): string {
  const dates = event.allDay
    ? `${dateStamp(event.start)}/${dateStamp(nextDay(event.end ?? event.start))}`
    : `${utcStamp(new Date(event.start))}/${utcStamp(new Date(event.end ?? event.start))}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    ctz: "Europe/London",
  });
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  if (event.location) params.set("location", event.location);
  if (event.rule)
    params.set("recur", `RRULE:${ruleFor(event.rule, event.allDay)}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

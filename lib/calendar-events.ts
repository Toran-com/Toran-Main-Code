// Mandir events and festival dates as calendar entries (see lib/ical.ts).

import type { FestivalDate, MandirDetails } from "@/lib/directory";
import { calendarLabel, londonDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/ical";
import { eventPath } from "@/lib/share";

type Mandir = Pick<MandirDetails, "slug" | "name" | "town" | "postcode"> & {
  events: MandirDetails["events"];
};

export function mandirCalendarEvents(
  mandir: Mandir,
  origin: string,
): CalendarEvent[] {
  const location = [mandir.name, mandir.town, mandir.postcode]
    .filter(Boolean)
    .join(", ");
  return mandir.events.map((event) => {
    const url = `${origin}${eventPath(mandir.slug, event.id)}`;
    const description = [
      event.title_gu,
      event.summary,
      event.summary_gu,
      [event.location_note, event.cost_note].filter(Boolean).join(" · "),
      event.link && `More details: ${event.link}`,
      `On Toran: ${url}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const repeating = Boolean(event.recurrence);
    // A repeating event starts on its first date; one-off events on their
    // own. All-day events are UK dates.
    const day = (iso: string) =>
      event.all_day ? londonDate(new Date(iso)) : iso;
    const start = day(event.starts_at);
    const end = event.ends_at ? day(event.ends_at) : null;
    return {
      uid: `event-${event.id}@toran`,
      title: event.title,
      description,
      location,
      url,
      start,
      end,
      allDay: event.all_day,
      rule: event.recurrence,
      skip: repeating
        ? (event.event_occurrences ?? [])
            .filter((o) => o.cancelled)
            .map((o) => day(o.starts_at))
        : [],
      cancelled: event.status === "cancelled",
    };
  });
}

export function festivalCalendarEvents(
  dates: FestivalDate[],
  origin: string,
): CalendarEvent[] {
  return dates.flatMap((date) => {
    if (!date.festival) return [];
    const label = calendarLabel(date.calendar);
    const url = `${origin}/festivals/${date.festival.slug}`;
    return [
      {
        uid: `festival-${date.id}@toran`,
        title: label ? `${date.festival.name} (${label})` : date.festival.name,
        description: [
          date.festival.summary,
          !date.verified &&
            "Date may vary: check with your mandir, as some follow a different calendar.",
          `On Toran: ${url}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        url,
        start: date.starts_on,
        end: date.ends_on,
        allDay: true,
      },
    ];
  });
}

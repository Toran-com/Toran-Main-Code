// Descriptions of events in the schema.org format search engines read, so
// a mandir's events can appear in Google's event listings after launch.
// See https://developers.google.com/search/docs/appearance/structured-data/event

import type { MandirDetails, MandirEvent } from "@/lib/directory";
import { londonDate } from "@/lib/format";

type Mandir = Pick<MandirDetails, "name" | "town" | "postcode" | "website">;

export function eventData(
  event: Pick<
    MandirEvent,
    | "title"
    | "summary"
    | "all_day"
    | "ends_at"
    | "status"
    | "recurrence"
    | "next_starts_at"
  >,
  mandir: Mandir,
  url: string,
) {
  // All-day events are dates; timed ones are moments. A repeating event is
  // described at its next date, whose end isn't stored.
  const start = event.all_day
    ? londonDate(new Date(event.next_starts_at))
    : new Date(event.next_starts_at).toISOString();
  const end =
    event.ends_at && !event.recurrence
      ? event.all_day
        ? londonDate(new Date(event.ends_at))
        : new Date(event.ends_at).toISOString()
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(event.summary && { description: event.summary }),
    startDate: start,
    ...(end && { endDate: end }),
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: mandir.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: mandir.town,
        ...(mandir.postcode && { postalCode: mandir.postcode }),
        addressCountry: "GB",
      },
    },
    organizer: {
      "@type": "Organization",
      name: mandir.name,
      ...(mandir.website && { url: mandir.website }),
    },
    url,
  };
}

// JSON for a <script> tag. "<" is escaped so text typed into an event can
// never close the tag early.
export function scriptJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

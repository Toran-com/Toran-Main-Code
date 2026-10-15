// Descriptions of pages in the schema.org format search engines read: the
// site itself, each mandir as a place, the trail of pages above a page, and
// events, so a mandir's events can appear in Google's event listings after
// launch.
// See https://developers.google.com/search/docs/appearance/structured-data/event

import type { MandirDetails, MandirEvent } from "@/lib/directory";
import { londonDate } from "@/lib/format";
import { site } from "@/lib/site";

type Mandir = Pick<MandirDetails, "name" | "town" | "postcode" | "website"> &
  Partial<Pick<MandirDetails, "latitude" | "longitude">>;

function address(
  mandir: Pick<MandirDetails, "town" | "postcode"> &
    Partial<Pick<MandirDetails, "region">>,
) {
  return {
    "@type": "PostalAddress",
    addressLocality: mandir.town,
    ...(mandir.region && { addressRegion: mandir.region }),
    ...(mandir.postcode && { postalCode: mandir.postcode }),
    addressCountry: "GB",
  };
}

function geo(mandir: Partial<Pick<MandirDetails, "latitude" | "longitude">>) {
  return mandir.latitude != null && mandir.longitude != null
    ? {
        geo: {
          "@type": "GeoCoordinates",
          latitude: mandir.latitude,
          longitude: mandir.longitude,
        },
      }
    : {};
}

// The site, for the home page: its name and address.
export function siteData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: site.name,
        description: site.description,
        url: `${origin}/`,
        inLanguage: "en-GB",
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: site.name,
        url: `${origin}/`,
      },
    ],
  };
}

// A mandir as a place of worship: name, address, map position, phone and
// website. Only the mandir's public details, never a person's.
export function mandirData(
  mandir: Pick<
    MandirDetails,
    | "name"
    | "town"
    | "region"
    | "postcode"
    | "website"
    | "phone"
    | "latitude"
    | "longitude"
  >,
  url: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "HinduTemple",
    "@id": `${url}#mandir`,
    name: mandir.name,
    url,
    address: address(mandir),
    ...geo(mandir),
    ...(mandir.phone && { telephone: mandir.phone }),
    ...(mandir.website && { sameAs: [mandir.website] }),
  };
}

// "Toran › Mandirs › Shree Ram Mandir": the pages above this one.
export function breadcrumbData(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

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
      address: address(mandir),
      ...geo(mandir),
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

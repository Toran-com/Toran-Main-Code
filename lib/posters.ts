// A poster or message about an event, forwarded to Toran and typed up for
// the mandir to check. Stored as a pending event_claim; only event details
// are kept, never who forwarded it.

import { EVENT_FIELDS, type EventInput } from "@/lib/event-form";

export const POSTER_SOURCES = {
  whatsapp: { label: "WhatsApp forward", kind: "forward" },
  email: { label: "Email", kind: "forward" },
  printed: { label: "Printed poster", kind: "forward" },
  facebook: { label: "Facebook post", kind: "facebook" },
  website: { label: "Mandir's website", kind: "website" },
  // Sent in through "Tell us about an event" (report_event in the
  // database); Toran doesn't type these up itself.
  visitor: { label: "Sent in by a visitor", kind: "public_report" },
} as const;

export type PosterSource = keyof typeof POSTER_SOURCES;

export type Poster = EventInput & { from: PosterSource; link: string };

// Reads a stored poster back, or null if it isn't one.
export function posterFrom(proposed: unknown): Poster | null {
  if (!proposed || typeof proposed !== "object" || Array.isArray(proposed)) {
    return null;
  }
  const p = proposed as Record<string, unknown>;
  const fields = [...EVENT_FIELDS, "from", "link"] as const;
  if (fields.some((f) => typeof p[f] !== "string")) return null;
  if (!(String(p.from) in POSTER_SOURCES)) return null;
  // Claims can be added outside Toran's form, so check the link again.
  if (!checkLink(String(p.link))) return null;
  const poster = Object.fromEntries(fields.map((f) => [f, p[f]])) as Poster;
  // The name and description in Gujarati, and a guess at the kind of
  // event, if the poster gave them.
  for (const f of ["title_gu", "summary_gu", "kind"] as const) {
    if (typeof p[f] === "string" && p[f]) poster[f] = p[f];
  }
  return poster;
}

// An optional "more details" link must be a web address.
export function checkLink(link: string): boolean {
  return link === "" || (link.length <= 300 && /^https?:\/\/\S+$/.test(link));
}

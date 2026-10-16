// Words and links for sharing a page or an event, mostly on WhatsApp,
// where most mandir news already travels.

import { formatEventStart } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";

type ShareableEvent = {
  id: string;
  title: string;
  next_starts_at: string;
  all_day: boolean;
  recurrence: string | null;
};

// "Diwali celebrations at Reading Hindu Temple, Reading: Sun 8 Nov, 6:30pm"
export function eventShareText(
  event: ShareableEvent,
  mandir: { name: string; town: string },
): string {
  const when = formatEventStart(event.next_starts_at, event.all_day);
  const rule = event.recurrence && describeRule(event.recurrence);
  return `${event.title} at ${mandir.name}, ${mandir.town}: ${rule ? `${rule}, next ${when}` : when}`;
}

// Where an event lives: its own page. (Older links to its card on the
// mandir's page, /mandirs/<slug>#event-<id>, still work.)
export function eventPath(mandirSlug: string, eventId: string): string {
  return `/mandirs/${mandirSlug}/events/${eventId}`;
}

// An event's seva rota, where volunteers can take a slot.
export function sevaPath(mandirSlug: string, eventId: string): string {
  return `${eventPath(mandirSlug, eventId)}/seva`;
}

// Opens WhatsApp (the app on a phone, WhatsApp Web on a computer) with the
// message ready to send to a chat or group.
export function whatsAppLink(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

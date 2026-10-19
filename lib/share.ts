// Words and links for sharing a page or an event, mostly on WhatsApp,
// where most mandir news already travels.

import { formatEventStart } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { sharedT } from "@/lib/i18n/locale";
import { whatsAppLink } from "@/lib/whatsapp";

export { whatsAppLink };

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
  const t = sharedT();
  const next = formatEventStart(event.next_starts_at, event.all_day);
  const rule = event.recurrence && describeRule(event.recurrence);
  return t("share.event", {
    title: event.title,
    name: mandir.name,
    town: mandir.town,
    when: rule ? t("event.repeatsNext", { rule, when: next }) : next,
  });
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

// What a committee member sends a colleague they've invited: Toran sends
// no email itself.
export function inviteShareText(
  mandir: { name: string; town: string },
  email: string,
): string {
  return `I've invited you to help run ${mandir.name}, ${mandir.town} on Toran. Log in with ${email} and press "Accept" on your account page (the invite lasts 14 days):`;
}

import { googleCalendarFeeds } from "@/lib/website-events";

// A mandir's own events calendar (Google Calendar, Outlook, or any
// iCalendar ".ics" address), which Toran reads every night for new events
// (lib/nightly.ts). Committees paste whatever address they have; this
// turns it into the feed to read, or says why it can't be used.

export const MAX_FEED_LENGTH = 500;

export type FeedAddress =
  { ok: true; url: string } | { ok: false; error: "empty" | "address" };

export function feedAddress(value: string): FeedAddress {
  let text = value.trim();
  if (!text) return { ok: false, error: "empty" };
  // Calendar apps hand out "webcal://" links: the same address over https.
  text = text.replace(/^webcals?:\/\//i, "https://");
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: "address" };
  }
  if (url.username || url.password) return { ok: false, error: "address" };
  url.protocol = "https:";

  // A Google Calendar's page or embed (…/calendar/embed?src=…): its feed.
  if (
    url.hostname === "calendar.google.com" &&
    !url.pathname.startsWith("/calendar/ical/")
  ) {
    const [feed] = googleCalendarFeeds(url.toString());
    if (!feed) return { ok: false, error: "address" };
    return { ok: true, url: feed };
  }

  const href = url.toString();
  if (href.length > MAX_FEED_LENGTH || /\s/.test(href)) {
    return { ok: false, error: "address" };
  }
  return { ok: true, url: href };
}

// How the address is shown back to the committee: where it is, without
// the private part (Google's "secret address" works like a password).
export function feedLabel(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Calendar";
  }
  if (parsed.hostname === "calendar.google.com") {
    return /\/private-[^/]+\//.test(parsed.pathname)
      ? "Google Calendar (secret address)"
      : "Google Calendar";
  }
  if (/outlook\.(live|office|office365)\.com$/.test(parsed.hostname)) {
    return "Outlook calendar";
  }
  return parsed.hostname.replace(/^www\./, "");
}

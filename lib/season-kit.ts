// A mandir's kit for a festival season (Diwali week, Navratri…): its
// events across the season's days, as a picture for WhatsApp, a message
// to send with it, and a noticeboard sheet (/mandirs/<slug>/kit/<season>).
// Only for the season the home page is pointing to, so the kit appears in
// the weeks before a festival and goes once it's over.

import { cacheLife, cacheTag } from "next/cache";
import {
  getMandir,
  listFestivalDates,
  type MandirDetails,
  type MandirEvent,
} from "@/lib/directory";
import {
  bannerSeason,
  type SeasonDay,
  seasonEvents,
  seasonWindow,
} from "@/lib/festival-season";
import { formatEventStart } from "@/lib/format";
import { type Season } from "@/lib/seasons";

// What fits on the picture at a size that reads on a phone.
export const PICTURE_EVENTS = 6;

export type SeasonKit = {
  season: Season;
  days: SeasonDay[];
  mandir: Omit<MandirDetails, "events">;
  events: MandirEvent[];
};

// The mandir's kit for the season being promoted now, or null when no
// season is coming up or the mandir has nothing listed for it.
export async function mandirKit(
  slug: string,
  seasonSlug?: string,
): Promise<SeasonKit | null> {
  "use cache";
  cacheTag("mandirs", `mandir:${slug}`, "festivals");
  cacheLife("hours");
  const [mandir, dates] = await Promise.all([
    getMandir(slug),
    listFestivalDates(),
  ]);
  if (mandir.state !== "ok" || !mandir.data || dates.state !== "ok") {
    return null;
  }
  const showing = bannerSeason(dates.data);
  if (!showing || (seasonSlug && showing.season.slug !== seasonSlug)) {
    return null;
  }
  const window = seasonWindow(showing.days)!;
  const { events: all, ...details } = mandir.data;
  const events = seasonEvents(
    all.filter((e) => e.status !== "cancelled"),
    showing.season,
    window,
  );
  if (!events.length) return null;
  return {
    season: showing.season,
    days: showing.days,
    mandir: details,
    events,
  };
}

// The message to send with the picture: each event on a line, then where
// to find the details. Plain text, as WhatsApp shows it.
export function kitMessage(kit: SeasonKit, url: string): string {
  const lines = kit.events.map(
    (e) => `• ${formatEventStart(e.next_starts_at, e.all_day)}: ${e.title}`,
  );
  return [
    `${kit.season.period} at ${kit.mandir.name}, ${kit.mandir.town}`,
    "",
    ...lines,
    "",
    `Details, and add them to your calendar: ${url}`,
  ].join("\n");
}

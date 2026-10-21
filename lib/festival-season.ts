// A festival season (lib/seasons.ts): several festivals close together
// that families think of as one, like Diwali week (Dhanteras, Diwali,
// Annakut and New Year, Bhai Dooj), or one big festival. One page gathers
// every mandir's events across those days. Pure, so the date rules are
// tested on their own.

import type { FestivalDate } from "@/lib/directory";
import { mentionsFestival } from "@/lib/festival-words";
import { londonDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/ical";
import { eventPath } from "@/lib/share";
import { SEASONS, type Season } from "@/lib/seasons";
import type { ListedEvent } from "@/lib/whats-on";

export { DIWALI, type Season } from "@/lib/seasons";

export type SeasonDay = {
  slug: string;
  name: string;
  starts_on: string;
  ends_on: string;
  verified: boolean;
};

// How far before or after the main festival the others can be.
const NEAR_DAYS = 10;
// How long before the main festival the season is announced on the home page.
export const BANNER_DAYS = 45;

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

// Which calendar's date to show when traditions differ: the date every
// tradition shares, then the Gujarati one (most UK mandirs), then any.
function preferred(dates: FestivalDate[]): FestivalDate | undefined {
  return (
    dates.find((d) => d.calendar === null) ??
    dates.find((d) => d.calendar === "gujarati") ??
    dates[0]
  );
}

// The season's festival days this time round: the main festival's next
// date, and each other festival's date near it. Empty if the main
// festival has no date yet.
export function seasonDays(
  dates: FestivalDate[],
  season: Season,
  today: string = londonDate(),
): SeasonDay[] {
  const upcoming = dates.filter((d) => d.ends_on >= today && d.festival);
  const mainDates = upcoming.filter((d) => d.festival!.slug === season.main);
  const firstStart = mainDates
    .map((d) => d.starts_on)
    .sort()
    .at(0);
  if (!firstStart) return [];
  const main = preferred(mainDates.filter((d) => d.starts_on === firstStart))!;

  return season.festivals
    .flatMap((slug) => {
      const near = upcoming.filter(
        (d) =>
          d.festival!.slug === slug &&
          daysBetween(d.starts_on, main.starts_on) <= NEAR_DAYS &&
          daysBetween(main.ends_on, d.starts_on) <= NEAR_DAYS,
      );
      const date = slug === season.main ? main : preferred(near);
      return date
        ? [
            {
              slug,
              name: date.festival!.name,
              starts_on: date.starts_on,
              ends_on: date.ends_on,
              verified: date.verified,
            },
          ]
        : [];
    })
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}

// From the first festival day to the last.
export function seasonWindow(
  days: SeasonDay[],
): { from: string; to: string } | null {
  if (!days.length) return null;
  return {
    from: days.map((d) => d.starts_on).sort()[0],
    to: days
      .map((d) => d.ends_on)
      .sort()
      .at(-1)!,
  };
}

// Events on the season's days that are part of it: named after one of its
// festivals, or marked as a festival by the mandir.
export function seasonEvents<
  T extends Pick<ListedEvent, "next_starts_at" | "title" | "summary" | "kind">,
>(events: T[], season: Season, window: { from: string; to: string }): T[] {
  return events.filter((e) => {
    const day = londonDate(new Date(e.next_starts_at));
    if (day < window.from || day > window.to) return false;
    const text = `${e.title} ${e.summary ?? ""}`;
    return (
      e.kind === "festival" ||
      season.festivals.some((slug) => mentionsFestival(slug, text))
    );
  });
}

// Whether the home page should point to the season: from a few weeks
// before the main festival until the last festival day.
export function showSeasonBanner(
  days: SeasonDay[],
  season: Season,
  today: string = londonDate(),
): boolean {
  const window = seasonWindow(days);
  const main = days.find((d) => d.slug === season.main);
  if (!window || !main) return false;
  return (
    today <= window.to && daysBetween(today, main.starts_on) <= BANNER_DAYS
  );
}

// The season's events as calendar entries: each event's date in the
// season, with the mandir in the title so a whole family's calendar makes
// sense at a glance.
export function seasonCalendarEvents(
  events: ListedEvent[],
  season: Season,
  origin: string,
): CalendarEvent[] {
  return events
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const url = `${origin}${eventPath(e.mandir.slug, e.id)}`;
      const start = e.all_day
        ? londonDate(new Date(e.next_starts_at))
        : e.next_starts_at;
      return {
        uid: `${season.slug}-${e.id}-${start.slice(0, 10)}@toran`,
        title: `${e.title} · ${e.mandir.name}`,
        description: [e.title_gu, e.summary, `On Toran: ${url}`]
          .filter(Boolean)
          .join("\n\n"),
        location: `${e.mandir.name}, ${e.mandir.town}`,
        url,
        start,
        allDay: e.all_day,
      };
    });
}

// The season the home page points to: of those whose banner is showing,
// the one whose main festival comes first.
export function bannerSeason(
  dates: FestivalDate[],
  today: string = londonDate(),
): { season: Season; days: SeasonDay[] } | null {
  const showing = SEASONS.map((season) => ({
    season,
    days: seasonDays(dates, season, today),
  })).filter(({ season, days }) => showSeasonBanner(days, season, today));
  const start = (days: SeasonDay[], season: Season) =>
    days.find((d) => d.slug === season.main)!.starts_on;
  showing.sort((a, b) =>
    start(a.days, a.season).localeCompare(start(b.days, b.season)),
  );
  return showing[0] ?? null;
}

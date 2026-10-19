import { calendarProblem, calendarResponse } from "@/lib/calendar-response";
import { listFestivalDates } from "@/lib/directory";
import {
  seasonCalendarEvents,
  seasonDays,
  seasonEvents,
  seasonWindow,
} from "@/lib/festival-season";
import { calendarFile } from "@/lib/ical";
import type { Season } from "@/lib/seasons";
import { listUpcomingEvents } from "@/lib/whats-on";

// Every mandir's events for a festival season, as a calendar to subscribe
// to (/<season>/calendar.ics).
export async function seasonCalendar(season: Season, origin: string) {
  const [dates, events] = await Promise.all([
    listFestivalDates(),
    listUpcomingEvents(),
  ]);
  if (dates.state !== "ok") return calendarProblem(dates.state);
  if (events.state !== "ok") return calendarProblem(events.state);
  const window = seasonWindow(seasonDays(dates.data, season));
  const during = window ? seasonEvents(events.data, season, window) : [];
  return calendarResponse(
    calendarFile(
      `${season.name} at mandirs · Toran`,
      seasonCalendarEvents(during, season, origin),
    ),
  );
}

import type { NextRequest } from "next/server";
import { calendarProblem, calendarResponse } from "@/lib/calendar-response";
import { listFestivalDates } from "@/lib/directory";
import {
  DIWALI,
  seasonCalendarEvents,
  seasonDays,
  seasonEvents,
  seasonWindow,
} from "@/lib/festival-season";
import { calendarFile } from "@/lib/ical";
import { listUpcomingEvents } from "@/lib/whats-on";

// Every mandir's Diwali events as a calendar to subscribe to.
export async function GET(request: NextRequest) {
  const [dates, events] = await Promise.all([
    listFestivalDates(),
    listUpcomingEvents(),
  ]);
  if (dates.state !== "ok") return calendarProblem(dates.state);
  if (events.state !== "ok") return calendarProblem(events.state);
  const window = seasonWindow(seasonDays(dates.data, DIWALI));
  const during = window ? seasonEvents(events.data, DIWALI, window) : [];
  return calendarResponse(
    calendarFile(
      "Diwali at mandirs · Toran",
      seasonCalendarEvents(during, DIWALI, request.nextUrl.origin),
    ),
  );
}

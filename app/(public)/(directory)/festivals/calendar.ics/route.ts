import type { NextRequest } from "next/server";
import { festivalCalendarEvents } from "@/lib/calendar-events";
import { calendarProblem, calendarResponse } from "@/lib/calendar-response";
import { listFestivalDates } from "@/lib/directory";
import { calendarFile } from "@/lib/ical";

// Upcoming festival dates as a calendar to subscribe to.
export async function GET(request: NextRequest) {
  const result = await listFestivalDates();
  if (result.state !== "ok") return calendarProblem(result.state);
  return calendarResponse(
    calendarFile(
      "Hindu festivals · Toran",
      festivalCalendarEvents(result.data, request.nextUrl.origin),
    ),
  );
}

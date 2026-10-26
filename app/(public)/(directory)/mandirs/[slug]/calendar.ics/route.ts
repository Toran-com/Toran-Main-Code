import { after, type NextRequest } from "next/server";
import { mandirCalendarEvents } from "@/lib/calendar-events";
import {
  calendarProblem,
  calendarResponse,
  notFound,
} from "@/lib/calendar-response";
import { recordCount, wantsCounting } from "@/lib/count-visit";
import { getMandir } from "@/lib/directory";
import { calendarFile } from "@/lib/ical";

// A mandir's upcoming events as a calendar to subscribe to, or one event
// (?event=<id>) as a file to add to any calendar app.
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/mandirs/[slug]/calendar.ics">,
) {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state !== "ok") return calendarProblem(result.state);
  const mandir = result.data;
  if (!mandir) return notFound();

  const events = mandirCalendarEvents(mandir, request.nextUrl.origin);
  const only = request.nextUrl.searchParams.get("event");
  if (only) {
    const event = events.find((e) => e.uid === `event-${only}@toran`);
    if (!event) return notFound();
    // One more "added to calendar" for the event's page.
    if (wantsCounting(request)) {
      after(() => recordCount("calendar", `/mandirs/${slug}/events/${only}`));
    }
    return calendarResponse(
      calendarFile(mandir.name, [{ ...event, remind: true }]),
      `${mandir.slug}-event`,
    );
  }
  return calendarResponse(calendarFile(`${mandir.name} · Toran`, events));
}

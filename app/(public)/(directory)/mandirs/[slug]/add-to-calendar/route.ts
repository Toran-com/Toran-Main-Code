import { NextResponse, type NextRequest } from "next/server";
import { mandirCalendarEvents } from "@/lib/calendar-events";
import { calendarProblem, notFound } from "@/lib/calendar-response";
import { getMandir } from "@/lib/directory";
import { googleCalendarLink } from "@/lib/ical";

// "Add to Google Calendar" for one event (?event=<id>): opens Google
// Calendar with the event filled in.
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/mandirs/[slug]/add-to-calendar">,
) {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state !== "ok") return calendarProblem(result.state);
  if (!result.data) return notFound();
  const id = request.nextUrl.searchParams.get("event");
  const event = mandirCalendarEvents(result.data, request.nextUrl.origin).find(
    (e) => e.uid === `event-${id}@toran`,
  );
  if (!event) return notFound();
  return NextResponse.redirect(googleCalendarLink(event), { status: 303 });
}

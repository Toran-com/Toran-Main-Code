import { after, NextResponse, type NextRequest } from "next/server";
import { mandirCalendarEvents } from "@/lib/calendar-events";
import { calendarProblem, notFound } from "@/lib/calendar-response";
import { recordCount, wantsCounting } from "@/lib/count-visit";
import { getMandirEvent } from "@/lib/directory";
import { googleCalendarLink } from "@/lib/ical";

// "Add to Google Calendar" for one event (?event=<id>): opens Google
// Calendar with the event filled in. It reads the event the same way the
// event's own page does (which is where the button is), so any event whose
// page shows the button can be added, however new it is or however many
// other events the mandir has.
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/mandirs/[slug]/add-to-calendar">,
) {
  const { slug } = await params;
  const id = request.nextUrl.searchParams.get("event") ?? "";
  const result = await getMandirEvent(slug, id);
  if (result.state !== "ok") return calendarProblem(result.state);
  if (!result.data) return notFound();
  const { mandir, event } = result.data;
  const [entry] = mandirCalendarEvents(
    { ...mandir, events: [event] },
    request.nextUrl.origin,
  );
  // One more "added to calendar" for the event's page.
  if (wantsCounting(request)) {
    after(() => recordCount("calendar", `/mandirs/${slug}/events/${id}`));
  }
  return NextResponse.redirect(googleCalendarLink(entry), { status: 303 });
}
